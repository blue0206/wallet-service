import { getClient } from "../core/db/pool.js";
import { ApiError } from "../types/api.js";
import {
  TRANSACTION_RULES,
  TransactionServiceParams,
  TransactionServiceResult,
} from "../types/transactions.js";
import { validateQueryResult } from "../core/utils/validateQueryResult.js";
import { TransactionIdSelectSchema } from "../schemas/transactions.schema.js";
import {
  WalletBalanceSelectSchema,
  WalletIdBalanceSelectSchema,
} from "../schemas/wallets.schema.js";
import type { Logger } from "pino";
import type { QueryResult } from "pg";
import type { TransactionIdSelect } from "../schemas/transactions.schema.js";
import type {
  WalletBalanceSelect,
  WalletIdBalanceSelect,
} from "../schemas/wallets.schema.js";

class TransactionService {
  async executeTransaction(
    logger: Logger,
    params: TransactionServiceParams,
  ): Promise<TransactionServiceResult> {
    const { userId, amount, currency, type, idempotencyKey, metadata } = params;
    const log = logger.child({
      endpoint: "POST /transactions",
      userId,
      currency,
      type,
      idempotencyKey,
    });

    const client = await getClient();

    // App transaction failure tracking variables. They will be used
    // when we need to update Transactions table with FAILED status and COMMIT the changes.
    // These will not be used in case of any other error, in that case we ROLLBACK.
    let failureReason: string | undefined;
    let failureStatus = 400;

    try {
      log.info({ amount: amount.toString() }, "executeTransaction start");

      // Transaction BEGIN
      await client.query("BEGIN");
      log.debug("Database transaction BEGIN");

      // Idempotency Check.
      const existingTxQuery: QueryResult = await client.query(
        "SELECT id FROM transactions WHERE idempotency_key = $1",
        [idempotencyKey],
      );

      // Rollback if transaction already exists and return id to indicate success.
      if (existingTxQuery.rows.length > 0) {
        log.info("Idempotency hit; returning existing transaction result.");
        // Validate the existing transaction row.
        const existingTx = validateQueryResult<TransactionIdSelect>(
          existingTxQuery.rows[0],
          TransactionIdSelectSchema,
        );
        // Get updated user balance.
        const currentBalanceQuery = await client.query(
          "SELECT balance FROM wallets WHERE user_id = $1 AND asset_type = $2 FOR UPDATE",
          [userId, currency],
        );
        const currentBalance = validateQueryResult<WalletBalanceSelect>(
          currentBalanceQuery.rows[0],
          WalletBalanceSelectSchema,
        );

        await client.query("ROLLBACK");
        log.debug("Database transaction rollback (idempotency)");
        return {
          transactionId: existingTx.id,
          currency,
          initialBalance: currentBalance.balance.toString(),
          updatedBalance: currentBalance.balance.toString(),
          alreadyProcessed: true,
          status: "SUCCESS",
        };
      }

      // FLOW:
      // 1. Lock wallets (system first, user second).
      // 2. Create transaction. REQ: (userId, idemp key, type, status, metadata) RETURN: (txId)
      // 3. Double entry in ledger. REQ: (txId, walletId, type, amount, description)
      // 4. Updating wallet balance. REQ: (walletId, amount)
      // 5. COMMIT changes.
      const { direction, systemWalletType } = TRANSACTION_RULES[type];
      log.debug({ direction, systemWalletType }, "Locking wallets");

      // Consistent locking, system wallet first, user wallet second.
      const systemWalletResult: QueryResult = await client.query(
        "SELECT id, balance FROM wallets WHERE wallet_type = $1 AND asset_type = $2 FOR UPDATE",
        [systemWalletType, currency],
      );
      const userWalletResult: QueryResult = await client.query(
        "SELECT id, balance FROM wallets WHERE user_id = $1 AND asset_type = $2 FOR UPDATE",
        [userId, currency],
      );

      if (systemWalletResult.rows.length === 0) {
        throw new ApiError(
          500,
          `The system wallet of type '${systemWalletType}' for asset type '${currency}' does not exist!`,
        );
      }
      if (userWalletResult.rows.length === 0) {
        throw new ApiError(
          404,
          `The wallet for user with id '${userId}' for asset type '${currency}' was not found.`,
        );
      }

      // Validate and store wallet results.
      const systemWallet = validateQueryResult<WalletIdBalanceSelect>(
        systemWalletResult.rows[0],
        WalletIdBalanceSelectSchema,
      );
      const userWallet = validateQueryResult<WalletIdBalanceSelect>(
        userWalletResult.rows[0],
        WalletIdBalanceSelectSchema,
      );
      log.debug(
        {
          systemWalletId: systemWallet.id,
          userWalletId: userWallet.id,
          systemWalletBalance: systemWallet.balance.toString(),
          userWalletBalance: userWallet.balance.toString(),
        },
        "Wallets locked",
      );

      // Check if user has sufficient funds  to make the transaction.
      if (direction == "OUTGOING" && (userWallet.balance as bigint) < amount) {
        failureReason = "Insufficient funds.";
        failureStatus = 402;
      }
      // Enforce that ONLY CP is purchased.
      if (type === "TOPUP" && currency === "CREDITS") {
        failureReason = "CREDITS cannot be purchased.";
      }
      // Enforce that CP is NEVER penalized.
      if (type === "PENALTY" && currency === "CP") {
        failureReason = "COD Points (CP) cannot be penalized.";
      }

      if (failureReason) {
        log.warn({ failureStatus, failureReason }, "Transaction rejected");
      }

      const txQuery: QueryResult = await client.query(
        `INSERT INTO transactions (user_id, idempotency_key, type, status, metadata) VALUES (
        $1, $2, $3, $4, $5) RETURNING id`,
        [
          userId,
          idempotencyKey,
          type,
          failureReason ? "FAILED" : "SUCCESS",
          JSON.stringify({ ...(metadata ?? {}), failureReason }),
        ],
      );

      const tx = validateQueryResult<TransactionIdSelect>(
        txQuery.rows[0],
        TransactionIdSelectSchema,
      );
      const transactionId = tx.id as string;
      log.info(
        {
          transactionId,
          status: failureReason ? "FAILED" : "SUCCESS",
        },
        "Transaction row inserted",
      );

      // If failed transaction, COMMIT changes for persistence
      // and throw error. This ensures we have data about failed transactions.
      if (failureReason) {
        await client.query("COMMIT");
        log.info(
          { transactionId },
          "Database transaction COMMIT (failed transaction stored)",
        );
        throw new ApiError(failureStatus, failureReason);
      }

      // Double entry in ledger for Debit and Credit.
      const debitSystem = direction === "INCOMING" ? true : false;
      const systemAmount = debitSystem ? -amount : amount;
      const userAmount = debitSystem ? amount : -amount;
      const debitDescription = `${currency} payout as a result of '${type}'.`;
      const creditDescription = `${currency} received as a result of ${type}.`;

      await client.query(
        `INSERT INTO ledger (transaction_id, wallet_id, type, amount, description) VALUES
         ($1, $2, $3, $4, $5),
         ($1, $6, $7, $8, $9)`,
        [
          transactionId,
          systemWallet.id,
          direction === "INCOMING" ? "DEBIT" : "CREDIT",
          systemAmount,
          debitSystem ? debitDescription : creditDescription,
          userWallet.id,
          direction === "INCOMING" ? "CREDIT" : "DEBIT",
          userAmount,
          debitSystem ? creditDescription : debitDescription,
        ],
      );
      log.debug(
        {
          transactionId,
          systemWalletId: systemWallet.id,
          userWalletId: userWallet.id,
          systemAmount: systemAmount.toString(),
          userAmount: userAmount.toString(),
        },
        "Ledger entries inserted",
      );

      // Update system wallet final balance.
      await client.query(
        "UPDATE wallets SET balance = balance + $1 WHERE id = $2",
        [systemAmount, systemWallet.id],
      );
      log.debug({ systemWalletId: systemWallet.id }, "System wallet updated");

      // Update user wallet with final balance and get updated balance to return in response.
      const updateUserWalletQuery = await client.query(
        "UPDATE wallets SET balance = balance + $1 WHERE id = $2 RETURNING id, balance",
        [userAmount, userWallet.id],
      );
      log.debug({ userWalletId: userWallet.id }, "User wallet updated");
      const updatedUserWallet = validateQueryResult<WalletBalanceSelect>(
        updateUserWalletQuery.rows[0],
        WalletBalanceSelectSchema,
      );

      // COMMIT transaction.
      await client.query("COMMIT");
      log.info(
        {
          transactionId,
          initialBalance: (userWallet.balance as bigint).toString(),
          updatedBalance: (updatedUserWallet.balance as bigint).toString(),
        },
        "Database transaction COMMIT",
      );

      return {
        transactionId,
        currency,
        initialBalance: (userWallet.balance as bigint).toString(),
        updatedBalance: (updatedUserWallet.balance as bigint).toString(),
        status: "SUCCESS",
        alreadyProcessed: false,
      };
    } catch (err: unknown) {
      // Rollback the transaction if not committed.
      if (!failureReason) {
        try {
          await client.query("ROLLBACK");
          log.debug("Database transaction ROLLBACK");
        } catch (error) {
          log.error({ err: error }, "Database transaction ROLLBACK failed");
          throw new ApiError(500, "Internal Server Error", error);
        }
      }

      if (err instanceof ApiError) {
        log.warn({ err }, "executeTransaction failed with ApiError");
        throw err;
      }
      log.error({ err }, "executeTransaction failed with unknown error");
      throw new ApiError(500, "Internal Server Error", err);
    } finally {
      client.release();
      log.debug("Database pool client released");
    }
  }
}

export const transactionService = new TransactionService();
