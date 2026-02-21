import { v4 as uuidv4 } from "uuid";
import { getClient } from "../core/db/pool.js";
import { validateQueryResult } from "../core/utils/validateQueryResult.js";
import { UserIdSelect, UserIdSelectSchema } from "../schemas/users.schema.js";
import {
  WalletIdBalanceAssetTypeSelect,
  WalletIdBalanceAssetTypeSelectSchema,
} from "../schemas/wallets.schema.js";
import { ApiError } from "../types/api.js";
import {
  RegisterUserServiceParams,
  RegisterUserServiceResult,
} from "../types/users.js";
import { transactionService } from "./transactions.service.js";
import type { Logger } from "pino";

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

      await client.query("BEGIN");
      log.debug("Database transaction BEGIN");

      // Create client.
      const clientQuery = await client.query(
        "INSERT INTO clients (username, email) VALUES ($1, $2) RETURNING id",
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

      await client.query("COMMIT");
      log.debug("Database transaction COMMIT");

      return {
        userId,
        username,
        cpBalance: cpWallet.balance.toString(),
        creditBalance: txResult.updatedBalance,
      };
    } catch (err: unknown) {
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
}

export const userService = new UserService();
