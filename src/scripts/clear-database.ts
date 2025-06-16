import dotenv from "dotenv";
import { testConnection, clearDocuments, getDocumentCount } from "../database";

dotenv.config();

async function main() {
  console.log("🧹 Clearing database...");

  try {
    // Test database connection
    console.log("🔄 Testing database connection...");
    await testConnection();

    // Get current count
    const beforeCount = await getDocumentCount();
    console.log(`📊 Current database contains ${beforeCount} documents`);

    if (beforeCount === 0) {
      console.log("💡 Database is already empty!");
      return;
    }

    // Clear all documents
    await clearDocuments();

    // Verify cleared
    const afterCount = await getDocumentCount();
    console.log(`🧹 Database cleared! Now contains ${afterCount} documents`);
    console.log("✅ Clear operation completed successfully!");
  } catch (error) {
    console.error("❌ Failed to clear database:", error);
    process.exit(1);
  }
}

main();
