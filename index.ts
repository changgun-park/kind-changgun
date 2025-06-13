import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function readAllDocuments(docsPath: string) {
  const documents: { [fileName: string]: string } = {};

  try {
    if (!fs.existsSync(docsPath)) {
      console.error(`Directory ${docsPath} does not exist.`);
      return {};
    }

    const files = fs.readdirSync(docsPath);

    for (const file of files) {
      if (file.endsWith("txt") || file.endsWith("md")) {
        try {
          const filePath = path.join(docsPath, file);
          const content = fs.readFileSync(filePath, "utf8");
          documents[file] = content;
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
        }
      }
    }
    return documents;
  } catch (error) {
    console.error("Error reading documents:", error);
    return {};
  }
}

function readDocument(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

async function askQuestion(
  documents: { [fileName: string]: string },
  question: string
): Promise<string> {
  try {
    let allContent = "";

    for (const [fileName, content] of Object.entries(documents)) {
      allContent += `\n--- ${fileName} ---\n${content}\n`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer questions based on the provided documents. Check external sources if needed. Always mention which document contains the information. If the answer isn't in any document, say 'I don't know.'.",
        },
        {
          role: "user",
          content: `Documents: ${allContent}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content || "No answer provided";
  } catch (error) {
    console.error("Error asking question:", error);
    return "An error occurred while answering the question.";
  }
}

async function main() {
  const document = readAllDocuments("./docs");

  if (!document) {
    console.error("Failed to read document. Please check the file path.");
    return;
  }

  const question =
    process.argv[2] || "What topics are covered in the documents?";

  const answer = await askQuestion(document, question);

  console.log("Answer:", answer);
}

main();
