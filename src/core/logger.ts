import { pino } from "pino";
import { config } from "./config.js";
import type { LoggerOptions } from "pino";

const level =
  config.LOG_LEVEL || config.NODE_ENV === "development" ? "debug" : "info";

const pinoOptions: LoggerOptions = { level };

pinoOptions.transport = undefined;
if (config.NODE_ENV === "development") {
  pinoOptions.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

pinoOptions.formatters = {
  level: (label): object => ({ level: label }),
};
pinoOptions.timestamp = pino.stdTimeFunctions.isoTime;

export const logger = pino(pinoOptions);

logger.info(`Logger initialized with level: ${level}`);
