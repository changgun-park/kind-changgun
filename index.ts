import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function readDocument(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

async function askQuestion(
  documentContent: string,
  question: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer questions based only on the provided document. If the answer isn't in the document, say 'I don't know based on the provided document.",
        },
        {
          role: "user",
          content: `Document: ${documentContent}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content || "No answer provided";
  } catch (error) {
    console.error("Error asking question:", error);
    return "An error occurred while answering the question.";
  }
}

async function main() {
  const document = readDocument("./my-doc.txt");

  if (!document) {
    console.error("Failed to read document. Please check the file path.");
    return;
  }

  const question = process.argv[2] || "what is the document about?";

  const answer = await askQuestion(document, question);
  console.log("Answer:", answer);
}

main();
