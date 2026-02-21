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

// This represents the Transactions Table row in DB.
const _TransactionInDBSchema = z.object({
  id: z.uuidv4(),
  user_id: z.uuidv4(),
  idempotency_key: z.uuidv4(),
  type: TransactionTypeEnum,
  status: TransactionStatusEnum,
  metadata: TransactionMetadataSchema,
  created_at: z.coerce.date(),
});

// This schema is for use throughout the application.
export const TransactionInDBSchema = _TransactionInDBSchema.transform(
  (data) => ({
    id: data.id,
    userId: data.user_id,
    idempotencyKey: data.idempotency_key,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    createdAt: data.created_at,
  }),
);
export type TransactionInDB = z.infer<typeof TransactionInDBSchema>;

// This schema is for validating SELECT statement results.
export const TransactionInDBSelectSchema = _TransactionInDBSchema
  .partial()
  .transform((data) => ({
    id: data.id,
    userId: data.user_id,
    idempotencyKey: data.idempotency_key,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    createdAt: data.created_at,
  }));
export type TransactionInDBSelect = z.infer<typeof TransactionInDBSelectSchema>;
