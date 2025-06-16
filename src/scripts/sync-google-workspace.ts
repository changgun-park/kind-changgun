import { testConnection, initializeDatabase } from "../database/connection";
import { syncGoogleWorkspaceFiles } from "../services/google-workspace-service";

async function main() {
  try {
    console.log("🚀 Starting Google Workspace document sync...");

    // Test database connection
    await testConnection();

    // Ensure database is initialized
    await initializeDatabase();

    // Sync Google Workspace files
    await syncGoogleWorkspaceFiles();

    console.log("🎉 Sync completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
