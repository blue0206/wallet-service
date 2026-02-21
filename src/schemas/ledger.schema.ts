import z from "zod";
import { ledgerTypeEnum } from "./enums.js";

// This represents the Ledger Table row in DB.
const _LedgerInDBSchema = z.object({
  id: z.uuidv4(),
  transaction_id: z.uuidv4(),
  wallet_id: z.uuidv4(),
  type: ledgerTypeEnum,
  amount: z.coerce.bigint(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
});

// This schema is for use throughout the application.
export const LedgerInDBSchema = _LedgerInDBSchema.transform((data) => ({
  id: data.id,
  transactionId: data.transaction_id,
  walletId: data.wallet_id,
  type: data.type,
  amount: data.amount,
  description: data.description,
  createdAt: data.created_at,
}));
export type LedgerInDB = z.infer<typeof LedgerInDBSchema>;

// This schema is for validating SELECT statement results.
export const LedgerInDBSelectSchema = _LedgerInDBSchema
  .partial()
  .transform((data) => ({
    id: data.id,
    transactionId: data.transaction_id,
    walletId: data.wallet_id,
    type: data.type,
    amount: data.amount,
    description: data.description,
    createdAt: data.created_at,
  }));
export type LedgerInDBSelect = z.infer<typeof LedgerInDBSelectSchema>;
