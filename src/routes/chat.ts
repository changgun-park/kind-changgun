import { Router } from "express";
import { findRelevantDocs } from "../database";
import { generateGoogleDriveLink } from "../utils/google-drive";
import OpenAI from "openai";

export const chatRouter = Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

chatRouter.post("/query", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const relevantDocs = await findRelevantDocs(question, 3);

    let messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system" as const,
        content: `당신은 3billion의 사내 챗봇 "창건씨"입니다. 

제공된 문서를 기반으로 질문에 답변하세요.

**중요한 규칙:**
- 문서에서 찾은 정보만 사용하세요
- 문서에 없는 정보는 추측하지 마세요
- 문서에 정보가 없으면 "문서에서 해당 정보를 찾을 수 없습니다"라고 답변하세요
- 답변은 한국어로 작성하세요
- 참고 문서 링크는 별도로 추가되므로 포함하지 마세요`,
      },
    ];

    if (relevantDocs.length > 0) {
      console.log(
        `📚 Using ${relevantDocs.length} documents for context (similarity may be low)`
      );

      const context = relevantDocs
        .map(
          (doc, index) =>
            `문서 ${index + 1} (${
              doc.originalFilename
            }, 유사도: ${doc.similarity.toFixed(3)}):\n${doc.content}`
        )
        .join("\n\n");

      messages.push({
        role: "user" as const,
        content: `참고할 문서들:\n${context}\n\n질문: ${question}`,
      });
    } else {
      console.log("📚 No documents found, using general knowledge");
      messages.push({
        role: "user" as const,
        content: `참고할 문서가 없습니다. 일반적인 지식으로 다음 질문에 답변하세요: ${question}`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    let answer = completion.choices[0].message.content || "No answer provided";

    // Always add document links manually
    const docsWithLinks = relevantDocs.filter((doc) => doc.googleDriveId);
    if (docsWithLinks.length > 0) {
      answer += "\n\n📄 참고 문서:\n";
      docsWithLinks.forEach((doc, index) => {
        const link = generateGoogleDriveLink(doc.googleDriveId!);
        answer += `${index + 1}. ${doc.originalFilename}: ${link}\n`;
      });
    } else if (relevantDocs.length > 0) {
      answer += "\n\n📄 참고 문서: 링크를 찾을 수 없습니다.";
    }

    res.json({
      answer,
      hasRelevantDocs: relevantDocs.length > 0,
      documentCount: relevantDocs.length,
      documents: relevantDocs.map((doc) => ({
        filename: doc.originalFilename,
        similarity: doc.similarity,
        link: doc.googleDriveId
          ? generateGoogleDriveLink(doc.googleDriveId)
          : null,
      })),
    });
  } catch (error) {
    console.error("❌ Error in chat query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
