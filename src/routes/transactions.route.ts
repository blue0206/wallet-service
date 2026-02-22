import { Router } from "express";
import assignClientDetails from "../middlewares/assignClientDetails.js";
import validateRequest from "../middlewares/validateRequest.js";
import { TransactionRequestBodySchema } from "../schemas/transactions.schema.js";
import { createTransaction } from "../controllers/transactions.controller.js";

const transactionRouter = Router();

transactionRouter.post(
  "/",
  assignClientDetails,
  validateRequest({ bodySchema: TransactionRequestBodySchema }),
  createTransaction,
);

export default transactionRouter;
