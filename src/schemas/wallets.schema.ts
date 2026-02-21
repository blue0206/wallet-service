import z from "zod";
import { AssetTypeEnum, WalletTypeEnum } from "./enums.js";

// Wallet Table row in DB.
export const WalletInDBSchema = z.object({
  id: z.uuidv4(),
  user_id: z.uuidv4().nullable(),
  wallet_type: WalletTypeEnum,
  asset_type: AssetTypeEnum,
  balance: z.coerce.bigint(),
  created_at: z.coerce.date(),
});
export type WalletInDB = z.infer<typeof WalletInDBSchema>;

// ID, Balance
export const WalletIdBalanceSelectSchema = WalletInDBSchema.pick({
  id: true,
  balance: true,
});
export type WalletIdBalanceSelect = z.infer<typeof WalletIdBalanceSelectSchema>;

// Balance
export const WalletBalanceSelectSchema = WalletInDBSchema.pick({
  balance: true,
});
export type WalletBalanceSelect = z.infer<typeof WalletBalanceSelectSchema>;

// ID, Balance, Asset Type
export const WalletIdBalanceAssetTypeSelectSchema = WalletInDBSchema.pick({
  id: true,
  balance: true,
  asset_type: true,
});
export type WalletIdBalanceAssetTypeSelect = z.infer<
  typeof WalletIdBalanceAssetTypeSelectSchema
>;

// ID, User ID, Balance
export const WalletIdUserIdBalanceSelectSchema = WalletInDBSchema.pick({
  id: true,
  user_id: true,
  balance: true,
});
export type WalletIdUserIdBalanceSelect = z.infer<
  typeof WalletIdUserIdBalanceSelectSchema
>;
