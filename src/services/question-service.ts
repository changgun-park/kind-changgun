// src/services/questionService.ts - Question answering logic
import OpenAI from "openai";
import { findRelevantDocs } from "../database";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askQuestion(question: string): Promise<string> {
  try {
    console.log("🔍 Using database for document search...");
    const relevantDocs = await findRelevantDocs(question, 3);

    if (relevantDocs.length === 0) {
      return "❌ Could not find relevant documents to answer your question.";
    }

    let allContent = "";
    for (const doc of relevantDocs) {
      allContent += `\n--- ${
        doc.originalFilename
      } (Similarity: ${doc.similarity.toFixed(3)}) ---\n${doc.content}\n`;
    }

    console.log(
      `📤 Sending ${relevantDocs.length} documents from database to OpenAI`
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer questions based on the provided documents. Always mention which document contains the information. If the answer isn't in any document, say 'I don't know.'",
        },
        {
          role: "user",
          content: `Documents: ${allContent}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content || "No answer provided";
  } catch (error) {
    console.error("❌ Error asking question:", error);
    throw new Error("An error occurred while answering the question.");
  }
}
