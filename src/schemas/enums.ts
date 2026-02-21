import z from "zod";

export const TransactionTypeEnum = z.enum([
  "TOPUP",
  "REWARD",
  "BONUS",
  "SPEND",
  "PENALTY",
]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const AssetTypeEnum = z.enum(["CP", "CREDITS"]);
export type AssetType = z.infer<typeof AssetTypeEnum>;

export const TransactionStatusEnum = z.enum(["SUCCESS", "FAILED", "PENDING"]);
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>;

export const WalletTypeEnum = z.enum([
  "USER",
  "SYSTEM_REVENUE",
  "SYSTEM_TREASURY",
]);
export type WalletType = z.infer<typeof WalletTypeEnum>;

export const ledgerTypeEnum = z.enum(["DEBIT", "CREDIT"]);
export type LedgerType = z.infer<typeof ledgerTypeEnum>;
