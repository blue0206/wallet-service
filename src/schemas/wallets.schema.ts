import z from "zod";
import { AssetTypeEnum, WalletTypeEnum } from "./enums.js";

// This represents the Wallet Table row in DB.
const _WalletInDBSchema = z.object({
  id: z.uuidv4(),
  user_id: z.uuidv4().nullable(),
  wallet_type: WalletTypeEnum,
  asset_type: AssetTypeEnum,
  balance: z.coerce.bigint(),
  created_at: z.coerce.date(),
});

// This schema is for use throughout the application.
export const WalletInDBSchema = _WalletInDBSchema.transform((data) => ({
  id: data.id,
  userId: data.user_id,
  walletType: data.wallet_type,
  assetType: data.asset_type,
  balance: data.balance,
  createdAt: data.created_at,
}));
export type WalletInDB = z.infer<typeof WalletInDBSchema>;

// This schema is for validating SELECT statement results.
export const WalletInDBSelectSchema = _WalletInDBSchema
  .partial()
  .transform((data) => ({
    id: data.id,
    userId: data.user_id,
    walletType: data.wallet_type,
    assetType: data.asset_type,
    balance: data.balance,
    createdAt: data.created_at,
  }));
export type WalletInDBSelect = z.infer<typeof WalletInDBSelectSchema>;
