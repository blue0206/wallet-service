import { Router } from "express";
import assignClientDetails from "../middlewares/assignClientDetails.js";
import validateRequest from "../middlewares/validateRequest.js";
import {
  GetAllBalancesRequestQuerySchema,
  GetUserBalanceRequestParamsSchema,
  GetUserHistoryRequestParamsSchema,
  GetUserHistoryRequestQuerySchema,
  RegisterUserRequestBodySchema,
} from "../schemas/users.schema.js";
import {
  getTransactionHistory,
  getUserBalance,
  listBalances,
  registerUser,
} from "../controllers/users.controller.js";

const userRouter = Router();

userRouter.post(
  "/",
  assignClientDetails,
  validateRequest({ bodySchema: RegisterUserRequestBodySchema }),
  registerUser,
);

userRouter.get(
  "/balance",
  validateRequest({ querySchema: GetAllBalancesRequestQuerySchema }),
  listBalances,
);

userRouter.get(
  "/balance/:userId",
  validateRequest({ paramsSchema: GetUserBalanceRequestParamsSchema }),
  getUserBalance,
);

userRouter.get(
  "/:userId/transactions",
  validateRequest({
    paramsSchema: GetUserHistoryRequestParamsSchema,
    querySchema: GetUserHistoryRequestQuerySchema,
  }),
  getTransactionHistory,
);

export default userRouter;
