import type { Request, Response } from "express";
import {
  TransactionRequestBody,
  TransactionRequestHeadersSchema,
} from "../schemas/transactions.schema.js";
import { ApiError, ApiResponse } from "../types/api.js";
import z from "zod";
import { transactionService } from "../services/transactions.service.js";
import type { TransactionMetadata } from "../schemas/transactions.schema.js";
import { TransactionServiceResult } from "../types/transactions.js";

export const createTransaction = async (
  req: Request<unknown, unknown, TransactionRequestBody>,
  res: Response,
): Promise<void> => {
  // Validate request header for idempotency key.
  const validatedHeaders = TransactionRequestHeadersSchema.safeParse(
    req.headers,
  );
  if (!validatedHeaders.success) {
    req.log.error("Idempotency Key missing in request headers.");
    throw new ApiError(
      400,
      "Bad Request: Idempotency Key missing.",
      z.prettifyError(validatedHeaders.error),
    );
  }

  // Extract relevant metadata from req
  const metadata: TransactionMetadata = {
    ip: req.clientDetails.ip,
    userAgent: req.clientDetails.userAgent,
    location: req.clientDetails.location,
    requestId: req.requestId,
    initialUserBalance: BigInt(0).toString(), // Will be set in service method.
    description: req.body.description,
  };

  // Execute transaction and return in response.
  const result = await transactionService.executeTransaction(req.log, {
    userId: req.body.userId,
    amount: req.body.amount,
    currency: req.body.assetType,
    type: req.body.transactionType,
    idempotencyKey: validatedHeaders.data["idempotency-key"],
    metadata,
  });

  const responseBody: ApiResponse<TransactionServiceResult> = {
    success: true,
    statusCode: 200,
    payload: result,
  };

  res.status(200).json(responseBody);
};
