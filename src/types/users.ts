import type { ClientDetailsType } from "../middlewares/assignClientDetails.js";
import type { GetUserHistory } from "../schemas/transactions.schema.js";

export interface RegisterUserServiceParams {
  username: string;
  email: string;
  requestId: string;
  clientDetails: ClientDetailsType;
}

export interface RegisterUserServiceResult {
  userId: string;
  creditBalance: string;
  cpBalance: string;
  username: string;
}

export interface GetBalanceResult extends Omit<
  RegisterUserServiceResult,
  "userId"
> {}

export interface GetAllBalancesResult {
  data: {
    username: string;
    balance: string;
    walletId: string;
  }[];
  nextCursor: {
    lastBalance: string;
    lastWalletId: string;
  } | null;
}

export interface GetUserHistoryResult {
  data: GetUserHistory;
  nextCursor: {
    lastTimestamp: Date;
    lastTransactionId: string;
  } | null;
}
