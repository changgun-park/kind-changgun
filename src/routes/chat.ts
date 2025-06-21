import { Router } from "express";
import { findRelevantDocs } from "../database";
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
        content:
          '당신은 3billion의 사내 챗봇 "창건씨"입니다. 제공된 문서가 있으면 그것을 기반으로 답변하고, 없으면 일반적인 지식으로 답변하되, 문서를 찾지 못했다면 그 사실을 명시해주세요.',
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
        content: `다음 문서들을 참고하여 질문에 답변해주세요. 문서의 유사도가 낮을 수 있으니, 관련성이 높은 정보만 사용하세요:\n\n${context}\n\n질문: ${question}`,
      });
    } else {
      console.log("📚 No documents found, using general knowledge");
      messages.push({
        role: "user" as const,
        content: `참고할 문서가 없습니다. 일반적인 지식으로 다음 질문에 답변해주세요: ${question}`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    res.json({
      answer,
      hasRelevantDocs: relevantDocs.length > 0,
      documentCount: relevantDocs.length,
      documents: relevantDocs.map((doc) => ({
        filename: doc.originalFilename,
        similarity: doc.similarity,
      })),
    });
  } catch (error) {
    console.error("❌ Error in chat query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
