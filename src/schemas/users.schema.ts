import z from "zod";
import { WalletInDBSchema } from "./wallets.schema.js";

// Users Table row in DB.
export const UserInDBSchema = z.object({
  id: z.uuidv4(),
  username: z.string(),
  email: z.email(),
  created_at: z.coerce.date(),
});
export type UserInDB = z.infer<typeof UserInDBSchema>;

export const UserIdSelectSchema = UserInDBSchema.pick({
  id: true,
});
export type UserIdSelect = z.infer<typeof UserIdSelectSchema>;

// Schema for query result output of retrieving a select user's balance.
export const UserBalanceResultSchema = UserInDBSchema.pick({
  username: true,
}).extend({
  balances: z.object({
    codPoints: WalletInDBSchema.shape.balance,
    credits: WalletInDBSchema.shape.balance,
  }),
});
export type UserBalanceResult = z.infer<typeof UserBalanceResultSchema>;

// Schema for query result output of retrieving all entries
// of a specific asset type of all users.
export const BalanceListResultSchema = z.array(
  UserInDBSchema.pick({
    username: true,
  }).extend({
    balance: WalletInDBSchema.shape.balance,
    walletId: WalletInDBSchema.shape.id,
  }),
);
export type BalanceListResult = z.infer<typeof BalanceListResultSchema>;

// Request Body schema for registering new user.
export const RegisterUserRequestBodySchema = z.object({
  username: z
    .string()
    .min(1, { error: "Username is required." })
    .max(50, "Username must be less than 50 characters long."),
  email: z.email({ error: "Invalid email." }),
});
export type RegisterUserRequestBody = z.infer<
  typeof RegisterUserRequestBodySchema
>;
