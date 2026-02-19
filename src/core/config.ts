import { z } from "zod";
import "dotenv/config";

const EnvironmentSchema = z.object({
  // node
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  // server
  PORT: z.coerce.number().int().positive().default(8000),
  // cors
  CORS_ORIGIN: z.string().min(1, { message: "CORS origin is missing." }),
  // db
  DB_HOST: z.string().min(1, { message: "DB_HOST is missing." }),
  DB_PASSWORD: z.string().min(1, { message: "DB_PASSWORD  is missing." }),
  DB_USER: z.string().min(1, { message: "DB_USER is missing." }),
  DB_NAME: z.string().min(1, { message: "DB_NAME is missing." }),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  // pino logger
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

const parsedEnv = EnvironmentSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables.",
    JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const config = parsedEnv.data;
export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;
