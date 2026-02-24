import cron from "node-cron";
import { logger } from "./logger.js";
import { getClient } from "./db/pool.js";
import { validateQueryResult } from "./utils/validateQueryResult.js";
import {
  WalletSyncResult,
  WalletSyncResultSchema,
} from "../schemas/ledger.schema.js";

export const systemWalletSyncWorker = cron.schedule(
  "* * * * *",
  syncSystemWalletBalance,
  { name: "System Wallet Sync Worker" },
);

/**
 * Syncs the system wallets' balance with the ledger entries.
 *
 * This worker is responsible for updating the system wallets' balance to reflect the changes made in the ledger.
 * It does this by aggregating the changes made in the ledger entries and then updating the respective system wallets' balance.
 * The worker uses a transaction to ensure that either all changes are applied or none are.
 *
 * The worker will log the number of system wallets updated and the net change made to each system wallet.
 */
async function syncSystemWalletBalance(): Promise<void> {
  const log = logger.child({ worker: "System Wallet Sync Worker" });
  const client = await getClient();

  try {
    log.debug("Starting system wallet sync worker....");
    await client.query("BEGIN");

    const query = `
        WITH unsynced_ledger AS (
            SELECT l.id, l.wallet_id, l.amount
            FROM ledger l
            WHERE l.system_synced = false
            FOR UPDATE OF l SKIP LOCKED
            LIMIT 10000
        ),
        aggregated_changes AS (
            SELECT wallet_id, SUM(amount) AS total_change
            FROM unsynced_ledger
            GROUP BY wallet_id
        ),
        update_wallets AS (
            UPDATE wallets w
            SET balance = balance + a.total_change
            FROM aggregated_changes a
            WHERE w.id = a.wallet_id
            RETURNING w.id, w.wallet_type, w.asset_type, w.balance, a.total_change
        ),
        mark_synced AS (
            UPDATE ledger l
            SET system_synced = true
            FROM unsynced_ledger u
            WHERE l.id = u.id
        )
        SELECT * FROM update_wallets;
    `;

    const result = await client.query(query);
    await client.query("COMMIT");

    if (result.rows.length > 0) {
      log.info(
        { updatedWallets: result.rows.length },
        "System wallets synced successfully.",
      );

      const syncResults = validateQueryResult<WalletSyncResult>(
        result.rows,
        WalletSyncResultSchema,
      );
      syncResults.forEach((res) => {
        log.info(
          {
            walletType: res.walletType,
            assetType: res.assetType,
            netChange: res.totalChange.toString(),
            newBalance: res.balance.toString(),
          },
          "System Wallet updated.",
        );
      });
    } else {
      log.debug("No new ledger entries to sync.");
    }
  } catch (error: unknown) {
    log.error({ err: error }, "System wallet sync failed.");
    try {
      await client.query("ROLLBACK");
    } catch (err: unknown) {
      log.error({ err: error }, "Database transaction ROLLBACK failed");
    }
  } finally {
    client.release();
  }
}
