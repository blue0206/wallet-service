import z from "zod";
import {
  AssetTypeEnum,
  ledgerTypeEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
  WalletTypeEnum,
} from "./enums.js";
import { LedgerInDBSchema } from "./ledger.schema.js";

// Transaction metadata in DB.
export const TransactionMetadataSchema = z.object({
  ip: z.string(),
  userAgent: z.string(),
  location: z.string(),
  requestId: z.string(),
  initialUserBalance: z.coerce.bigint(),
  description: z.string().optional(),
  failureReason: z.string().optional(),
});
export type TransactionMetadata = z.infer<typeof TransactionMetadataSchema>;

// Transactions Table row in DB.
export const TransactionInDBSchema = z.object({
  id: z.uuidv4(),
  user_id: z.uuidv4(),
  idempotency_key: z.uuidv4(),
  type: TransactionTypeEnum,
  status: TransactionStatusEnum,
  metadata: TransactionMetadataSchema,
  created_at: z.coerce.date(),
});
export type TransactionInDB = z.infer<typeof TransactionInDBSchema>;

// Select ID only from transactions table.
export const TransactionIdSelectSchema = TransactionInDBSchema.pick({
  id: true,
});
export type TransactionIdSelect = z.infer<typeof TransactionIdSelectSchema>;

// The schema for return type of SQL query that retrieves
// User's transaction history with ledger details.
export const GetUserHistorySchema = z.array(
  TransactionInDBSchema.omit({
    user_id: true,
    idempotency_key: true,
    id: true,
    type: true,
  })
    .extend({
      transaction_id: TransactionInDBSchema.shape.id,
      transaction_type: TransactionInDBSchema.shape.type,
      ledgerEntries: z.array(
        z.object({
          ledger_id: LedgerInDBSchema.shape.id,
          wallet_type: WalletTypeEnum,
          asset_type: AssetTypeEnum,
          entry_type: ledgerTypeEnum,
          amount: LedgerInDBSchema.shape.amount,
          description: LedgerInDBSchema.shape.description,
        }),
      ),
    })
    .transform((data) => ({
      transactionId: data.transaction_id,
      transactionType: data.transaction_type,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.created_at,
      ledgerEntries: data.ledgerEntries.map((entry) => ({
        ledgerId: entry.ledger_id,
        walletType: entry.wallet_type,
        assetType: entry.asset_type,
        entryType: entry.entry_type,
        amount: entry.amount,
        description: entry.description,
      })),
    })),
);
export type GetUserHistory = z.infer<typeof GetUserHistorySchema>;

// Request Body
export const TransactionRequestBodySchema = z.object({
  userId: z.uuidv4({ error: "Invalid User ID" }),
  transactionType: TransactionTypeEnum,
  assetType: AssetTypeEnum,
  amount: z.coerce
    .bigint()
    .positive({ error: "Amount must be a positive integer." }),
  description: z.string().optional(),
});
export type TransactionRequestBody = z.infer<
  typeof TransactionRequestBodySchema
>;

// Request Header
export const TransactionRequestHeadersSchema = z.looseObject({
  "idempotency-key": z.uuidv4({ error: "Idempotency Key must be valid UUID." }),
});
export type TransactionRequestHeaders = z.infer<
  typeof TransactionRequestHeadersSchema
>;
