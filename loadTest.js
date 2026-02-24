import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const API_URL = "http://localhost:8000/api/v1/transactions";
const TOTAL_REQUESTS = 50000; // Total transactions to fire
const CONCURRENCY = 1008; // 1008 concurrent API requests (though (1008 - max pool size) will queue in Node.js)
const TRANSACTION_TYPE = ["REWARD", "SPEND", "BONUS", "PENALTY", "TOPUP"];
const ASSET_TYPE = ["CREDITS", "CP"];
let txIdx = 0;
let assetIdx = 0;

async function runStressTest() {
  if (!fs.existsSync("users.json")) {
    console.error("❌ users.json not found! Run seed-api.ts first.");
    process.exit(1);
  }

  const userIds = JSON.parse(fs.readFileSync("users.json", "utf-8"));
  if (userIds.length === 0) {
    console.error("❌ No users in users.json!");
    process.exit(1);
  }

  console.log(`🔥 STRESS TEST INITIATED`);
  console.log(`Target: ${API_URL}`);
  console.log(
    `Requests: ${TOTAL_REQUESTS} | Concurrency: ${CONCURRENCY} | Users: ${userIds.length}`,
  );

  const stats = {
    http200: 0,
    http402: 0,
    http4xx: 0,
    http5xx: 0,
    networkErrors: 0,
  };

  let completed = 0;
  let i = 0;
  const startTime = Date.now();

  const worker = async () => {
    while (i < TOTAL_REQUESTS) {
      i++;
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
      const idempotencyKey = uuidv4();

      const txType = TRANSACTION_TYPE[txIdx];
      let assetType = ASSET_TYPE[assetIdx];
      if (assetType === "CREDITS" && txType === "TOPUP") {
        assetType = "CP";
      }
      if (assetType === "CP" && txType === "PENALTY") {
        assetType = "CREDITS";
      }

      txIdx = (txIdx + 1) % 5;
      assetIdx = (assetIdx + 1) % 2;
      // Generate a random amount.
      const amount = Math.floor(Math.random() * 48) + 1; // 1 to 48

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": idempotencyKey,
            "x-load-test": "true",
          },
          body: JSON.stringify({
            userId: randomUserId,
            transactionType: txType,
            assetType: assetType,
            amount: amount,
            description: `Load Test Tx ${idempotencyKey.substring(0, 8)}`,
          }),
        });

        if (res.status === 200) stats.http200++;
        else if (res.status === 402) stats.http402++;
        else if (res.status >= 400 && res.status < 500) stats.http4xx++;
        else if (res.status >= 500) stats.http5xx++;
      } catch (err) {
        stats.networkErrors++;
      } finally {
        completed++;
        if (completed % 5000 === 0)
          console.log(`\r⏳ Progress: ${completed}/${TOTAL_REQUESTS}`);
      }
    }
  };

  // Launch workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = (Date.now() - startTime) / 1000;

  console.log("\n\n=======================================");
  console.log("🛑 STRESS TEST COMPLETE");
  console.log("=======================================");
  console.log(`Time Taken:          ${durationSec.toFixed(2)} seconds`);
  console.log(
    `Throughput:          ${(TOTAL_REQUESTS / durationSec).toFixed(2)} req/sec`,
  );
  console.log("---------------------------------------");
  console.log(`✅ 200 (SUCCESS):         ${stats.http200}`);
  console.log(`💸 402 (INSUFFICIENT FUNDS):    ${stats.http402}`);
  console.log(`⚠️  4xx (CLIENT ERRORS):   ${stats.http4xx}`);
  console.log(`🔥 5xx (SERVER CRASHES):  ${stats.http5xx}`);
  console.log(`💥 NETWORK/OS ERRORS:     ${stats.networkErrors}`);
  console.log("=======================================");
}

runStressTest();
