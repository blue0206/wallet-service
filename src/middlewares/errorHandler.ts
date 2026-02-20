import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { ApiError, ApiResponse } from "../types/api.js";
import { config } from "../core/config.js";

/**
 * Error handler middleware.
 *
 * This middleware catches any errors that may occur during the request lifecycle,
 * logs the error, and sends a response to the client with the appropriate status code and payload.
 *
 * If the error is an instance of ApiError, the status code and payload are taken from the error.
 * If the error is not an instance of ApiError, the status code is set to 500 and the payload is set to "Internal Server Error".
 *
 * In production mode, errors with status codes >= 500 are sanitized and the payload is set to "Internal Server Error".
 */
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
