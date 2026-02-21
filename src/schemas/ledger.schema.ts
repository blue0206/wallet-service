import z from "zod";
import { ledgerTypeEnum } from "./enums.js";

// Ledger Table row in DB.
export const LedgerInDBSchema = z.object({
  id: z.uuidv4(),
  transaction_id: z.uuidv4(),
  wallet_id: z.uuidv4(),
  type: ledgerTypeEnum,
  amount: z.coerce.bigint(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
});
export type LedgerInDB = z.infer<typeof LedgerInDBSchema>;
