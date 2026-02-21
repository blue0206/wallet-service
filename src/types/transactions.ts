import { AssetType, TransactionStatus } from "../schemas/enums.js";
import type { TransactionMetadata } from "../schemas/transactions.schema.js";

export interface TransactionServiceParams {
  userId: string;
  amount: bigint;
  currency: "CP" | "CREDITS";
  type: "TOPUP" | "SPEND" | "BONUS" | "REWARD" | "PENALTY";
  idempotencyKey: string;
  metadata: TransactionMetadata;
}

export interface TransactionServiceResult {
  transactionId: string;
  status: TransactionStatus;
  currency: AssetType;
  alreadyProcessed: boolean;
  // Return amount as string to avoid bigint JSON serialization errors.
  initialBalance: string;
  updatedBalance: string;
}

// INCOMING: System -> User
// OUTGOING: User -> System
export const TRANSACTION_RULES = {
  TOPUP: { direction: "INCOMING", systemWalletType: "SYSTEM_TREASURY" },
  BONUS: { direction: "INCOMING", systemWalletType: "SYSTEM_TREASURY" },
  REWARD: { direction: "INCOMING", systemWalletType: "SYSTEM_TREASURY" },
  SPEND: { direction: "OUTGOING", systemWalletType: "SYSTEM_REVENUE" },
  PENALTY: { direction: "OUTGOING", systemWalletType: "SYSTEM_REVENUE" },
} as const;
