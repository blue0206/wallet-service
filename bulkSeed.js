import fs from "fs";

const API_URL = "http://localhost:8000/api/v1/users";
const TOTAL_USERS = 25000; // Let's create 1,000 users
const CONCURRENCY = 1008; // 1008 concurrent API requests (though (1008 - max pool size) will queue in Node.js)

async function runSeed() {
  console.log(
    `🌱 API Seeding ${TOTAL_USERS} users at concurrency ${CONCURRENCY}...`,
  );
  const startTime = Date.now();
  const userIds = [];
  let completed = 0;
  let i = 0;

  const stats = {
    http2xx: 0,
    http4xx: 0,
    http5xx: 0,
    networkErrors: 0,
  };

  const worker = async () => {
    while (i < TOTAL_USERS) {
      const currentIndex = i++;
      const username = `LoadTester_${currentIndex}_${Date.now()}`;
      const email = `tester${currentIndex}_${Date.now()}@cod.com`;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-load-test": "true",
          },
          body: JSON.stringify({ username, email }),
        });

        const data = await res.json();
        if (res.status === 201 && data.payload.userId) {
          stats.http2xx++;
          userIds.push(data.payload.userId);
        } else if (res.status >= 400 && res.status < 500) {
          stats.http4xx++;
        } else if (res.status >= 500) {
          stats.http5xx++;
        }
      } catch (err) {
        console.error(`Network error on user ${currentIndex}:`, err);
        stats.networkErrors++;
      } finally {
        completed++;
        if (completed % 5000 === 0)
          console.log(`✅ Created ${completed}/${TOTAL_USERS} users...`);
      }
    }
  };

  // Launch exactly 50 workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // Save the generated IDs to a file for the stress tester to use
  fs.writeFileSync("users.json", JSON.stringify(userIds));

  const durationSec = (Date.now() - startTime) / 1000;
  console.log("\n\n=======================================");
  console.log("🛑 BULK SEED COMPLETE");
  console.log("=======================================");
  console.log(`Time Taken:          ${durationSec.toFixed(2)} seconds`);
  console.log(
    `Throughput:          ${(TOTAL_USERS / durationSec).toFixed(2)} req/sec`,
  );
  console.log("---------------------------------------");
  console.log(`✅ 200 (SUCCESS):         ${stats.http2xx}`);
  console.log(`⚠️  4xx (CLIENT ERRORS):   ${stats.http4xx}`);
  console.log(`🔥 5xx (SERVER CRASHES):  ${stats.http5xx}`);
  console.log(`💥 NETWORK/OS ERRORS:     ${stats.networkErrors}`);
  console.log("=======================================");

  console.log(
    `\n🎉 Created ${userIds.length} users in ${durationSec.toFixed(2)}s. Saved to users.json.`,
  );
}

runSeed();
