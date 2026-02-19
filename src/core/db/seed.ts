import fs from "fs";
import path from "path";
import { pool } from "./pool.js";
import { logger } from "../logger.js";
import { config as _ } from "../config.js";

const initDb = async () => {
  const client = await pool.connect();

  try {
    logger.info("⏳ Seeding Database...");

    const sqlPath = path.join(import.meta.dirname, "../../../sql/setup.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    await client.query(sql);

    logger.info("✅ Database seeded.");
    logger.info("👤 Users Created: Blue, Soap");
    logger.info("💵 Assets: COD Points (CP), CREDITS (C)");
  } catch (error) {
    logger.error(error, "❌ Database seeding failed.");
  } finally {
    client.release();
    process.exit(0);
  }
};

initDb();
