import dotenv from "dotenv";
import { testConnection, getDocumentCount, listDocuments } from "../database";

dotenv.config();

async function main() {
  console.log("📊 Checking database status...");

  try {
    // Test database connection
    console.log("🔄 Testing database connection...");
    await testConnection();

    // Get document count
    const dbCount = await getDocumentCount();
    console.log(`📊 Database contains ${dbCount} documents`);

    if (dbCount > 0) {
      // List all documents
      console.log("\n📋 Documents in database:");
      const docs = await listDocuments();
      docs.forEach((doc, index) => {
        console.log(
          `  ${index + 1}. ${
            doc.filename
          } (updated: ${doc.updatedAt.toLocaleDateString()})`
        );
      });
    } else {
      console.log(
        "💡 Database is empty. Run load-documents script to add documents."
      );
    }

    console.log("\n✅ Database status check complete!");
  } catch (error) {
    console.error("❌ Failed to check database status:", error);
    process.exit(1);
  }
}

main();
