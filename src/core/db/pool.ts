import { config } from "../config.js";
import pg from "pg";
import type { PoolClient, QueryResult } from "pg";
import { logger } from "../logger.js";

const { Pool } = pg;

export const pool = new Pool({
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  host: config.DB_HOST,
  database: config.DB_NAME,
  port: config.DB_PORT,
  max: 20,
  idleTimeoutMillis: 32000,
  connectionTimeoutMillis: 2000,
});

// Listener for errors on idle clients.
pool.on("error", (err: Error, _client: PoolClient) => {
  logger.fatal(err, "Unexpected error on idle client.");
  process.exit(1);
});

/**
 * Execute a SQL query with optional parameters.
 *
 * @param {string} text - SQL query to execute
 * @param {any[]} [params] - Optional parameters to pass to the query
 * @returns {Promise<QueryResult>} - Result of the executed query
 *
 * @example
 * const result = await query("SELECT * FROM users WHERE id = $1", [1]);
 */
export const query = async (
  text: string,
  params?: any[],
): Promise<QueryResult> => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 100) {
    logger.warn({ text, duration, result }, "Slow query.");
  }

  return result;
};

/**
 * Retrieves a client from the pool.
 *
 * @returns {Promise<PoolClient>} - A client from the pool
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};
