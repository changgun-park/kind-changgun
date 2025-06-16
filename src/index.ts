import { Server } from "./server";

async function main() {
  console.log("🚀 Starting Slack bot server...");

  const server = new Server();
  await server.start();
}

main().catch((error) => {
  console.error("❌ Application startup failed:", error);
  process.exit(1);
});
