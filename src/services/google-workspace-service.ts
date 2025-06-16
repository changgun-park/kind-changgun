import { google } from "googleapis";
import path from "path";
import { storeDocument } from "../database"; // Your existing function

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "billion-drive-extractor-b26755c4059d.json"),
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ],
});

const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });
const sheets = google.sheets({ version: "v4", auth });

// Your existing extraction functions (unchanged)
async function extractDocContent(documentId: string) {
  try {
    const doc = await docs.documents.get({ documentId });
    let text = "";

    if (doc.data.body?.content) {
      doc.data.body.content.forEach((element: any) => {
        if (element.paragraph) {
          element.paragraph.elements?.forEach((elem: any) => {
            if (elem.textRun) {
              text += elem.textRun.content;
            }
          });
        }
      });
    }

    return text;
  } catch (error) {
    console.error(`Error extracting doc ${documentId}:`, error);
    return null;
  }
}

async function extractSheetContent(spreadsheetId: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const sheetNames =
      spreadsheet.data.sheets?.map((sheet) => sheet.properties?.title) || [];
    let allContent = "";

    for (const sheetName of sheetNames) {
      if (sheetName) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: sheetName,
        });

        const rows = response.data.values || [];
        allContent += `\n--- Sheet: ${sheetName} ---\n`;
        rows.forEach((row) => {
          allContent += row.join(" | ") + "\n";
        });
      }
    }

    return allContent;
  } catch (error) {
    console.error(`Error extracting sheet ${spreadsheetId}:`, error);
    return null;
  }
}

// NEW: Extract and store all Google Workspace documents
export async function syncGoogleWorkspaceFiles(): Promise<void> {
  console.log("🔄 Starting Google Workspace sync...");

  try {
    // Get all Google Docs and Sheets
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet'",
      fields: "files(id,name,mimeType,modifiedTime)",
    });

    const files = response.data.files || [];
    console.log(`📁 Found ${files.length} Google Workspace files`);

    for (const file of files) {
      console.log(`📄 Processing: ${file.name}`);

      let content = null;
      let fileName = "";

      if (file.mimeType === "application/vnd.google-apps.document") {
        content = await extractDocContent(file.id!);
        fileName = `[GoogleDoc] ${file.name}`;
      } else if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
        content = await extractSheetContent(file.id!);
        fileName = `[GoogleSheet] ${file.name}`;
      }

      if (content && content.trim().length > 0) {
        // Use your existing storeDocument function
        await storeDocument(fileName, content);
      } else {
        console.log(`⚠️  Skipping ${file.name} - no content extracted`);
      }
    }

    console.log("✅ Google Workspace sync completed!");
  } catch (error) {
    console.error("❌ Error during Google Workspace sync:", error);
    throw error;
  }
}
