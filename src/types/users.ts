import type { ClientDetailsType } from "../middlewares/assignClientDetails.js";

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
