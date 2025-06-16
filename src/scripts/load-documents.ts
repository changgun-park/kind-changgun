import dotenv from "dotenv";
import { testConnection, storeDocuments, getDocumentCount } from "../database";
import { readAllDocuments } from "../utils/file-reader";

dotenv.config();

async function main() {
  console.log("📁 Loading documents into database...");

  try {
    // Test database connection
    console.log("🔄 Testing database connection...");
    await testConnection();

    // Read documents from ./docs folder
    const documents = readAllDocuments("./docs");

    if (Object.keys(documents).length === 0) {
      console.error("❌ No documents found to load!");
      console.log("💡 Please create a 'docs' folder with .txt or .md files");
      process.exit(1);
    }

    // Store documents in database
    await storeDocuments(documents);

    // Get final count
    const dbCount = await getDocumentCount();
    console.log(`🎉 Success! Database now contains ${dbCount} documents!`);
  } catch (error) {
    console.error("❌ Failed to load documents:", error);
    process.exit(1);
  }
}

main();
