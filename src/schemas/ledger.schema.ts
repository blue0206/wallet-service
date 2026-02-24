import z from "zod";
import { AssetTypeEnum, ledgerTypeEnum, WalletTypeEnum } from "./enums.js";
import { WalletInDBSchema } from "./wallets.schema.js";

// Ledger Table row in DB.
export const LedgerInDBSchema = z.object({
  id: z.uuidv4(),
  transaction_id: z.uuidv4(),
  wallet_id: z.uuidv4(),
  type: ledgerTypeEnum,
  amount: z.coerce.bigint(),
  description: z.string().nullable(),
  system_synced: z.boolean(),
  created_at: z.coerce.date(),
});
export type LedgerInDB = z.infer<typeof LedgerInDBSchema>;

// Schema for wallet sync worker query result.
export const WalletSyncResultSchema = z.array(
  z
    .object({
      id: WalletInDBSchema.shape.id,
      wallet_type: WalletTypeEnum,
      asset_type: AssetTypeEnum,
      balance: WalletInDBSchema.shape.balance,
      total_change: z.coerce.bigint(),
    })
    .transform((data) => ({
      id: data.id,
      walletType: data.wallet_type,
      assetType: data.asset_type,
      balance: data.balance,
      totalChange: data.total_change,
    })),
);
export type WalletSyncResult = z.infer<typeof WalletSyncResultSchema>;
