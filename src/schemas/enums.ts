import z from "zod";

export const TransactionTypeEnum = z.enum([
  "TOPUP",
  "REWARD",
  "BONUS",
  "SPEND",
  "PENALTY",
]);

export const AssetTypeEnum = z.enum(["CP", "CREDITS"]);

export const TransactionStatusEnum = z.enum(["SUCCESS", "FAILED", "PENDING"]);

export const WalletTypeEnum = z.enum([
  "USER",
  "SYSTEM_REVENUE",
  "SYSTEM_TREASURY",
]);

export const ledgerTypeEnum = z.enum(["DEBIT", "CREDIT"]);
