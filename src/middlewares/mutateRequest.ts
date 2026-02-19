import { v4 as uuidv4 } from "uuid";
import { logger } from "../core/logger.js";
import { pinoHttp } from "pino-http";
import type { Request, Response, NextFunction } from "express";

// This middleware assigns a uuidv4 to every request and
// creates a child logger for every request and passes it forward.
export const assignRequestIdAndChildLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  req.requestId = uuidv4();
  req.log = logger.child({
    service: "wallet-service",
    requestId: req.requestId,
  });
  res.setHeader("x-request-id", req.requestId);
  next();
};

// Logs start and end of request.
export const loggerMiddleware = pinoHttp({
  logger,
  customProps: (req: Request) => ({
    service: "wallet-service",
    requestId: req.requestId,
  }),
});
