import fs from "fs";
import path from "path";

// Read documents from directory
export function readAllDocuments(docsPath: string): {
  [fileName: string]: string;
} {
  const documents: { [fileName: string]: string } = {};

  try {
    if (!fs.existsSync(docsPath)) {
      console.error(`Directory ${docsPath} does not exist.`);
      return {};
    }

    const files = fs.readdirSync(docsPath);
    console.log(`📁 Found ${files.length} files in ${docsPath}`);

    for (const file of files) {
      if (file.endsWith("txt") || file.endsWith("md")) {
        try {
          const filePath = path.join(docsPath, file);
          const content = fs.readFileSync(filePath, "utf8");
          documents[file] = content;
          console.log(`✅ Loaded: ${file}`);
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
        }
      }
    }

    console.log(`📚 Total documents loaded: ${Object.keys(documents).length}`);
    return documents;
  } catch (error) {
    console.error("Error reading documents:", error);
    return {};
  }
}
