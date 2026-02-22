import {
  GetAllBalancesRequestQuery,
  GetUserBalanceRequestParams,
  GetUserHistoryRequestParams,
  GetUserHistoryRequestQuery,
  RegisterUserRequestBody,
} from "../schemas/users.schema.js";
import { userService } from "../services/users.service.js";
import { ApiResponse } from "../types/api.js";
import type { Request, Response } from "express";
import type {
  GetAllBalancesResult,
  GetBalanceResult,
  GetUserHistoryResult,
  RegisterUserServiceResult,
} from "../types/users.js";

export const registerUser = async (
  req: Request<unknown, unknown, RegisterUserRequestBody>,
  res: Response,
): Promise<void> => {
  const result = await userService.register(req.log, {
    username: req.body.username,
    email: req.body.email,
    requestId: req.requestId,
    clientDetails: req.clientDetails,
  });

  const responseBody: ApiResponse<RegisterUserServiceResult> = {
    success: true,
    statusCode: 201,
    payload: result,
  };

  res.status(201).json(responseBody);
};

export const getUserBalance = async (
  req: Request<GetUserBalanceRequestParams>,
  res: Response,
): Promise<void> => {
  const result = await userService.getBalanceForUserId(
    req.log,
    req.params.userId,
  );

  const responseBody: ApiResponse<GetBalanceResult> = {
    success: true,
    statusCode: 200,
    payload: result,
  };
  res.status(200).json(responseBody);
};

export const listBalances = async (
  req: Request<unknown, unknown, unknown, GetAllBalancesRequestQuery>,
  res: Response,
): Promise<void> => {
  // req.query is converted to number as validation middleware
  // does not coerce params and query.
  const result = await userService.getAllBalances(
    req.log,
    req.query.currency,
    typeof req.query.limit === "number"
      ? req.query.limit
      : parseInt(req.query.limit),
    req.query.lastWalletId,
    req.query.lastBalance?.toString(),
  );

  const responseBody: ApiResponse<GetAllBalancesResult> = {
    success: true,
    statusCode: 200,
    payload: result,
  };
  res.status(200).json(responseBody);
};

export const getTransactionHistory = async (
  req: Request<
    GetUserHistoryRequestParams,
    unknown,
    unknown,
    GetUserHistoryRequestQuery
  >,
  res: Response,
): Promise<void> => {
  // req.query is converted to number as validation middleware
  // does not coerce params and query.
  const result = await userService.getUserHistory(
    req.log,
    req.params.userId,
    typeof req.query.limit === "number"
      ? req.query.limit
      : parseInt(req.query.limit),
    req.query.lastTimestamp?.toISOString(),
    req.query.lastTransactionId,
  );

  const responseBody: ApiResponse<GetUserHistoryResult> = {
    success: true,
    statusCode: 200,
    payload: result,
  };
  res.status(200).json(responseBody);
};
