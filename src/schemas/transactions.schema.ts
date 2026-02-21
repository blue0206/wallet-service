import z from "zod";
import {
  AssetTypeEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from "./enums.js";

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

export const TransactionIdSelectSchema = TransactionInDBSchema.pick({
  id: true,
});
export type TransactionIdSelect = z.infer<typeof TransactionIdSelectSchema>;

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
