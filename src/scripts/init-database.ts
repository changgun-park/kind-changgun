import dotenv from "dotenv";
import { testConnection, initializeDatabase } from "../database";

dotenv.config();

async function main() {
  console.log("🔧 Initializing database...");

  try {
    // Test database connection
    console.log("🔄 Testing database connection...");
    await testConnection();

    // Initialize database schema
    await initializeDatabase();

    console.log("🎉 Database initialized successfully!");
    console.log("💡 You can now run 'load-documents' to add documents.");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  }
}

main();
