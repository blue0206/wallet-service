import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { ApiError, ApiResponse } from "../types/api.js";
import { config } from "../core/config.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  req.log.error(
    {
      err,
      url: req.url,
      method: req.method,
      ip: req.ip,
    },
    err.message || "An error occurred in the error middleware.",
  );

  const ErrorPayload: ApiResponse<string> = {
    success: false,
    statusCode: 500,
    payload: "Internal Server Error",
  };

  if (err instanceof ApiError) {
    ErrorPayload.statusCode = err.statusCode;
    ErrorPayload.payload = err.message;
  }

  // Sanitize errors before sending response in production.
  if (config.NODE_ENV === "production" && ErrorPayload.statusCode >= 500) {
    ErrorPayload.payload = "Internal Server Error";
  }

  res.status(ErrorPayload.statusCode).json(ErrorPayload);
};
