import { config } from "./core/config.js";
import express from "express";
import cors from "cors";
import {
  assignRequestIdAndChildLogger,
  loggerMiddleware,
} from "./middlewares/mutateRequest.js";
import { logger } from "./core/logger.js";
import { pool, query } from "./core/db/pool.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { ApiError, ApiResponse, HealthcheckPayload } from "./types/api.js";
import userRouter from "./routes/users.route.js";
import transactionRouter from "./routes/transactions.route.js";
import type { Request, Response } from "express";
import type { Server } from "http";

const app = express();
// Assign request id and child logger via middleware.
app.use(assignRequestIdAndChildLogger);
// Assign logger middleware for http logging.
app.use(loggerMiddleware);
// Cors Middleware
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(","),
  }),
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/transactions", transactionRouter);
// Healthcheck
app.use("/api/v1/healthcheck", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT NOW()");
    const response: ApiResponse<HealthcheckPayload> = {
      success: true,
      statusCode: 200,
      payload: {
        time: result.rows[0].now,
        message: "OK",
      },
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    req.log.error(error, "Healthcheck failed.");
    const errorResponse: ApiResponse<string> = {
      success: false,
      statusCode: 500,
      payload: "Database Error",
    };
    res.status(500).json(errorResponse);
  }
});

// Catch-all route.
app.use((_req: Request, _res: Response) => {
  throw new ApiError(404, "This route does not exist.");
});

// Error Middleware
app.use(errorHandler);

// Server
const PORT = config.PORT;
const server: Server = app.listen(PORT, async () => {
  logger.info(
    `Server running on port ${config.PORT.toString()} in ${config.NODE_ENV} mode`,
  );
  logger.info("Postgres Connection Pool initialized.");
});

//---------GRACEFUL SHUTDOWN--------

// Signals to listen for.
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
let shuttingDown = false;

// eslint-disable-next-line @typescript-eslint/require-await
async function gracefulShutdown(signal: NodeJS.Signals): Promise<void> {
  // Set flag to prevent multiple shutdown calls.
  if (shuttingDown) {
    logger.warn(`Already shutting down. Ignoring signal: ${signal}`);
    return;
  }
  shuttingDown = true;
  logger.warn(`Received ${signal}. Gracefully shutting down....`);

  // Stop server.
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error shutting down server.");
      process.exitCode = 1;
    } else {
      logger.info("Server has shutdown successfully.");
    }

    // Close the DB connection pool.
    logger.info("Closing Postgres Connection Pool....");
    try {
      await pool.end();
      logger.info("Postgres Connection Pool closed successfully.");
    } catch (error) {
      logger.error({ err: error }, "Error closing Postgres Connection Pool.");
      process.exitCode = 1;
    }

    logger.info("Graceful shutdown complete. Exiting....");
    process.exit();
  });

  // Failsafe Timeout
  const shutDownTimeout = 32000;
  setTimeout(() => {
    logger.error(
      `Graceful shutdown timed out after ${(shutDownTimeout / 1000).toString()}s. Forcing exit....`,
    );
    process.exit(1);
  }, shutDownTimeout).unref();
}

// Register Signal Handlers
signals.forEach((signal: NodeJS.Signals) => {
  process.on(signal, async () => {
    console.log(`Received ${signal}. Gracefully shutting down....`);
    await gracefulShutdown(signal);
  });
});

// Uncaught Exceptions / Unhandled Rejections
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught Exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({ err: reason, promise }, "Unhandled Rejection");
  process.exit(1);
});
