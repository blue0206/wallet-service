import { v4 as uuidv4 } from "uuid";
import { getClient, query } from "../core/db/pool.js";
import { ApiError } from "../types/api.js";
import { validateQueryResult } from "../core/utils/validateQueryResult.js";
import {
  BalanceListResultSchema,
  UserBalanceResultSchema,
  UserIdSelectSchema,
} from "../schemas/users.schema.js";
import { WalletIdBalanceAssetTypeSelectSchema } from "../schemas/wallets.schema.js";
import { transactionService } from "./transactions.service.js";
import type { WalletIdBalanceAssetTypeSelect } from "../schemas/wallets.schema.js";
import type {
  BalanceListResult,
  UserBalanceResult,
  UserIdSelect,
} from "../schemas/users.schema.js";
import type {
  GetAllBalancesResult,
  GetBalanceResult,
  GetUserHistoryResult,
  RegisterUserServiceParams,
  RegisterUserServiceResult,
} from "../types/users.js";
import type { AssetType } from "../schemas/enums.js";
import type { Logger } from "pino";
import {
  GetUserHistory,
  GetUserHistorySchema,
} from "../schemas/transactions.schema.js";

class UserService {
  async register(
    logger: Logger,
    params: RegisterUserServiceParams,
  ): Promise<RegisterUserServiceResult> {
    const { username, email, requestId, clientDetails } = params;
    const log = logger.child({
      endpoint: "POST /users",
      requestId,
      username,
    });

    const client = await getClient();

    try {
      log.debug("Register start");

      // Transaction BEGIN
      await client.query("BEGIN");
      log.debug("Database transaction BEGIN");

      // Create client.
      const clientQuery = await client.query(
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id",
        [username, email],
      );
      const validatedClient = validateQueryResult<UserIdSelect>(
        clientQuery.rows[0],
        UserIdSelectSchema,
      );
      const userId = validatedClient.id;
      log.info({ userId }, "User created");

      // Create wallets.
      const walletQuery = await client.query(
        `INSERT INTO wallets (user_id, asset_type) VALUES
         ($1, 'CP'),
         ($1, 'CREDITS') RETURNING id, balance, asset_type`,
        [userId],
      );
      let cpWallet = validateQueryResult<WalletIdBalanceAssetTypeSelect>(
        walletQuery.rows[0],
        WalletIdBalanceAssetTypeSelectSchema,
      );
      let creditsWallet = validateQueryResult<WalletIdBalanceAssetTypeSelect>(
        walletQuery.rows[1],
        WalletIdBalanceAssetTypeSelectSchema,
      );

      // Swap if wallets are different.
      if (cpWallet.asset_type === "CREDITS") {
        [cpWallet, creditsWallet] = [creditsWallet, cpWallet];
      }
      log.debug(
        {
          userId,
          cpWalletId: cpWallet.id,
          cpBalance: cpWallet.balance.toString(),
          creditsWalletId: creditsWallet.id,
          creditsBalance: creditsWallet.balance.toString(),
        },
        "Wallets created",
      );

      // Give sign-up bonus.
      log.info({ userId }, "Executing transaction for sign-up bonus");
      const txResult = await transactionService.executeTransaction(
        logger,
        {
          userId,
          amount: 250n,
          currency: creditsWallet.asset_type,
          idempotencyKey: uuidv4(),
          type: "BONUS",
          metadata: {
            ip: clientDetails.ip,
            userAgent: clientDetails.userAgent,
            location: clientDetails.location,
            requestId,
            initialUserBalance: creditsWallet.balance,
            description: `Sign-up Bonus for user ${username}.`,
          },
        },
        client,
      );
      log.info(
        {
          userId,
          creditBalance: txResult.updatedBalance,
        },
        "Sign-up bonus applied",
      );

      // Transaction COMMIT
      await client.query("COMMIT");
      log.debug("Database transaction COMMIT");

      return {
        userId,
        username,
        cpBalance: cpWallet.balance.toString(),
        creditBalance: txResult.updatedBalance,
      };
    } catch (err: unknown) {
      // Transaction ROLLBACK in case of errors.
      try {
        await client.query("ROLLBACK");
      } catch (error: unknown) {
        log.error({ err: error }, "Database transaction ROLLBACK failed");
        throw new ApiError(500, "Internal Server Error", error);
      }

      if (err instanceof ApiError) {
        log.warn({ err }, "register failed with ApiError");
        throw err;
      }
      log.error({ err }, "register failed with unknown error");
      throw new ApiError(500, "Internal Server Error", err);
    } finally {
      client.release();
      log.debug("Database pool client released");
    }
  }

  async getBalanceForUserId(
    logger: Logger,
    userId: string,
  ): Promise<GetBalanceResult> {
    const log = logger.child({
      endpoint: "GET /users/balance/:userId",
      userId,
    });

    try {
      log.debug("getBalanceForUserId start");
      const userBalanceQuery = await query(
        `SELECT
            user.username,
            json_object_agg(wallet.asset_type, wallet.balance::text) AS balances
            FROM users user 
            LEFT JOIN wallets wallet ON user.id = wallet.user_id
            WHERE user.id = $1
            GROUP BY user.id`,
        [userId],
      );
      log.debug(
        { rowCount: userBalanceQuery.rowCount },
        "User balance fetched",
      );

      if (userBalanceQuery.rows.length === 0) {
        throw new ApiError(404, `User with id '${userId}' not found.`);
      }
      const userBalance = validateQueryResult<UserBalanceResult>(
        userBalanceQuery.rows[0],
        UserBalanceResultSchema,
      );

      const result = {
        username: userBalance.username,
        cpBalance: userBalance.balances.codPoints.toString(),
        creditBalance: userBalance.balances.credits.toString(),
      };
      log.info(
        {
          username: result.username,
          cpBalance: result.cpBalance,
          creditBalance: result.creditBalance,
        },
        "getBalanceForUserId success",
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        log.warn({ err: error }, "getBalanceForUserId failed with ApiError");
        throw error;
      }
      log.error(
        { err: error },
        "getBalanceForUserId failed with unknown error",
      );
      throw new ApiError(500, "Internal Server Error", error);
    }
  }

  async getAllBalances(
    logger: Logger,
    currency: AssetType,
    limit: number,
    lastWalletId?: string,
    lastBalance?: bigint,
  ): Promise<GetAllBalancesResult> {
    const log = logger.child({
      endpoint: "GET /users/balance",
      currency,
      limit,
      lastWalletId,
      lastBalance: lastBalance ? lastBalance.toString() : undefined,
    });

    try {
      log.debug("getAllBalances start");
      const balancesQuery = await query(
        `SELECT
            user.username,
            wallet.balance,
            wallet.id AS wallet_id
            FROM wallets wallet
            JOIN users user ON wallet.user_id = user.id
            WHERE wallet.asset_type = $1 
                AND wallet.wallet_type = 'USER'
                AND ($2::bigint IS NULL OR (wallet.balance, wallet.id) < ($2::bigint, $3::uuid))
            ORDER BY wallet.balance DESC, wallet.id DESC
            LIMIT $4`,
        [
          currency,
          lastBalance ? lastBalance.toString() : null,
          lastWalletId || null,
          limit,
        ],
      );
      log.debug(
        { rowCount: balancesQuery.rowCount },
        "Balances query completed",
      );

      const balances = validateQueryResult<BalanceListResult>(
        balancesQuery.rows,
        BalanceListResultSchema,
      );

      const result = {
        data: balances.map((balance) => ({
          username: balance.username,
          balance: balance.balance.toString(),
          walletId: balance.walletId,
        })),
        nextCursor:
          balances.length > 0
            ? {
                lastBalance: balances[balances.length - 1].balance.toString(),
                lastWalletId: balances[balances.length - 1].walletId,
              }
            : null,
      };
      log.info(
        {
          resultCount: result.data.length,
          hasNextCursor: Boolean(result.nextCursor),
        },
        "getAllBalances success",
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        log.warn({ err: error }, "getAllBalances failed with ApiError");
        throw error;
      }
      log.error({ err: error }, "getAllBalances failed with unknown error");
      throw new ApiError(500, "Internal Server Error", error);
    }
  }

  async getUserHistory(
    logger: Logger,
    userId: string,
    limit: number,
    lastTimestamp?: string,
    lastTransactionId?: string,
  ): Promise<GetUserHistoryResult> {
    const log = logger.child({
      endpoint: "GET /users/:userId/transactions",
      userId,
      limit,
      lastTimestamp,
      lastTransactionId,
    });

    try {
      log.debug("getUserHistory start");
      const getUserHistoryQuery = await query(
        `WITH paginated_tx AS (
            SELECT id, type, status, created_at, metadata
            FROM transactions
            WHERE user_id = $1
                AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
            ORDER BY created_at DESC, id DESC
            LIMIT $4
          )
          SELECT
            tx.id AS transaction_id,
            tx.type AS transaction_type,
            tx.status,
            tx.created_at,
            tx.metadata,
            json_agg(
                json_build_object(
                    'ledger_id', l.id,
                    'wallet_type', wallet.wallet_type,
                    'asset_type', wallet.asset_type,
                    'entry_type', l.type,
                    'amount', l.amount::text,
                    'description', l.description
                )
            ) AS ledger_entries
          FROM paginated_tx tx
          JOIN ledger l ON tx.id = l.transaction_id
          JOIN wallets wallet ON l.wallet_id = wallet.id
          GROUP BY
            tx.id,
            tx.type,
            tx.status,
            tx.created_at,
            tx.metadata
          ORDER BY
            tx.created_at DESC,
            tx.id DESC
          `,
        [userId, lastTimestamp, lastTransactionId, limit],
      );

      const userHistory = validateQueryResult<GetUserHistory>(
        getUserHistoryQuery.rows,
        GetUserHistorySchema,
      );

      const result = {
        data: userHistory,
        nextCursor:
          userHistory.length > 0
            ? {
                lastTimestamp: userHistory[userHistory.length - 1].createdAt,
                lastTransactionId:
                  userHistory[userHistory.length - 1].transactionId,
              }
            : null,
      };
      log.info(
        {
          resultCount: result.data.length,
          hasNextCursor: Boolean(result.nextCursor),
        },
        "getUserHistory success",
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        log.warn({ err: error }, "getUserHistory failed with ApiError");
        throw error;
      }
      log.error({ err: error }, "getUserHistory failed with unknown error");
      throw new ApiError(500, "Internal Server Error", error);
    }
  }
}

export const userService = new UserService();
