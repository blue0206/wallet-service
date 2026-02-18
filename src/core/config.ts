import { z } from "zod";

const EnvironmentSchema = z.object({
  // node
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  // server
  PORT: z.coerce.number().int().positive().default(8000),
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
