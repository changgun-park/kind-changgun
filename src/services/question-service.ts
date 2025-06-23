// src/services/questionService.ts - Question answering logic
import OpenAI from "openai";
import { findRelevantFullDocuments } from "../database";
import { generateGoogleDriveLink } from "../utils/google-drive";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askQuestion(question: string): Promise<string> {
  try {
    console.log("🔍 Using database for document search...");

    // Try with higher threshold first
    let relevantDocs = await findRelevantFullDocuments(question, 3, 0.6);

    // If no documents found, try with lower threshold
    if (relevantDocs.length === 0) {
      console.log(
        "⚠️ No documents found with high threshold, trying lower threshold..."
      );
      relevantDocs = await findRelevantFullDocuments(question, 3, 0.0);
    }

    if (relevantDocs.length === 0) {
      return "❌ 죄송합니다. 질문과 관련된 문서를 찾을 수 없습니다. 다른 방식으로 질문해 주시거나, 관리자에게 문의해 주세요.";
    }

    let allContent = "";
    for (const doc of relevantDocs) {
      allContent += `\n--- ${
        doc.originalFilename
      } (Similarity: ${doc.similarity.toFixed(3)}, Chunks: ${
        doc.chunkCount
      }) ---\n${doc.fullContent}\n`;
    }

    console.log(
      `📤 Sending ${relevantDocs.length} documents from database to OpenAI`
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 3billion의 사내 챗봇 "창건씨"입니다. 

제공된 문서를 기반으로 질문에 답변하세요.

**중요한 규칙:**
- 문서에서 찾은 정보만 사용하세요
- 문서에 없는 정보는 추측하지 마세요
- 문서에 정보가 없으면 "문서에서 해당 정보를 찾을 수 없습니다"라고 답변하세요
- 답변은 한국어로 작성하세요
- 참고 문서 링크는 별도로 추가되므로 포함하지 마세요`,
        },
        {
          role: "user",
          content: `참고할 문서들:\n${allContent}\n\n질문: ${question}`,
        },
      ],
      temperature: 0.1,
    });

    let answer = response.choices[0].message.content || "No answer provided";

    // Always add document links manually
    const docsWithLinks = relevantDocs.filter((doc) => doc.googleDriveId);
    if (docsWithLinks.length > 0) {
      answer += "\n\n📄 참고 문서:\n";
      docsWithLinks.forEach((doc, index) => {
        const link = generateGoogleDriveLink(doc.googleDriveId!);
        answer += `${index + 1}. ${doc.originalFilename}: ${link}\n`;
      });
    } else {
      answer += "\n\n📄 참고 문서: 링크를 찾을 수 없습니다.";
    }

    return answer;
  } catch (error) {
    console.error("❌ Error asking question:", error);
    throw new Error("An error occurred while answering the question.");
  }
}
