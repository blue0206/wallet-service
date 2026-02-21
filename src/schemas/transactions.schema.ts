import z from "zod";
import { TransactionStatusEnum, TransactionTypeEnum } from "./enums.js";

// Transaction metadata in DB.
export const TransactionMetadataSchema = z
  .object({
    ip: z.string(),
    userAgent: z.string(),
    location: z.string(),
    requestId: z.string(),
    initialUserBalance: z.coerce.bigint(),
    description: z.string().optional(),
    failureReason: z.string().optional(),
  })
  .nullable();
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
