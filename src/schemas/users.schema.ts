import z from "zod";
import { WalletInDBSchema } from "./wallets.schema.js";
import { AssetTypeEnum } from "./enums.js";

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
})
  .extend({
    balances: z.object({
      CP: WalletInDBSchema.shape.balance,
      CREDITS: WalletInDBSchema.shape.balance,
    }),
  })
  .transform((data) => ({
    username: data.username,
    balances: {
      codPoints: data.balances.CP,
      credits: data.balances.CREDITS,
    },
  }));
export type UserBalanceResult = z.infer<typeof UserBalanceResultSchema>;

// Schema for query result output of retrieving all entries
// of a specific asset type of all users.
export const BalanceListResultSchema = z.array(
  UserInDBSchema.pick({
    username: true,
  })
    .extend({
      balance: WalletInDBSchema.shape.balance,
      wallet_id: WalletInDBSchema.shape.id,
    })
    .transform((data) => ({
      username: data.username,
      balance: data.balance,
      walletId: data.wallet_id,
    })),
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

// Request Params schema for retrieving user's balance.
export const GetUserBalanceRequestParamsSchema = z.object({
  userId: z.uuidv4({ error: "Invalid User ID" }),
});
export type GetUserBalanceRequestParams = z.infer<
  typeof GetUserBalanceRequestParamsSchema
>;

// Request Query schema for retrieving all users' balance list.
export const GetAllBalancesRequestQuerySchema = z.object({
  currency: AssetTypeEnum,
  limit: z.coerce.number().int().positive().min(1).optional().default(11),
  lastWalletId: z.uuidv4().optional(),
  lastBalance: z.coerce.bigint().optional(),
});
export type GetAllBalancesRequestQuery = z.infer<
  typeof GetAllBalancesRequestQuerySchema
>;

// Request Params schema for retrieving a user's transaction history.
export const GetUserHistoryRequestParamsSchema =
  GetUserBalanceRequestParamsSchema;
export type GetUserHistoryRequestParams = z.infer<
  typeof GetUserHistoryRequestParamsSchema
>;

// Request Query schema for retrieving a user's transaction history.
export const GetUserHistoryRequestQuerySchema = z.object({
  limit: GetAllBalancesRequestQuerySchema.shape.limit,
  lastTimestamp: z.coerce.date().optional(),
  lastTransactionId: z.uuidv4().optional(),
});
export type GetUserHistoryRequestQuery = z.infer<
  typeof GetUserHistoryRequestQuerySchema
>;
