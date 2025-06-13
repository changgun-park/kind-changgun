import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DocumentWithEmbedding {
  fileName: string;
  content: string;
  embedding: number[];
}

const EMBEDDINGS_FILE = "./embeddings.json";

function readAllDocuments(docsPath: string) {
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

async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
    throw error;
  }
}

async function storeDocuments(documents: { [fileName: string]: string }) {
  console.log("🔍 Creating embeddings and storing documents...");
  const documentsWithEmbedding: DocumentWithEmbedding[] = [];

  try {
    for (const [fileName, content] of Object.entries(documents)) {
      console.log(`⏳ Processing ${fileName}...`);

      const embedding = await createEmbedding(content);

      documentsWithEmbedding.push({
        fileName,
        content,
        embedding,
      });

      console.log(`✅ Embedded: ${fileName}`);
    }

    fs.writeFileSync(
      EMBEDDINGS_FILE,
      JSON.stringify(documentsWithEmbedding, null, 2)
    );

    console.log(
      `💾 Saved ${documentsWithEmbedding.length} documents to ${EMBEDDINGS_FILE}`
    );
    console.log("✅ All documents processed and stored!");
  } catch (error) {
    console.error("❌ Error storing documents in ChromaDB:", error);
  }
}

function loadStoredDocuments(): DocumentWithEmbedding[] {
  try {
    if (fs.existsSync(EMBEDDINGS_FILE)) {
      const data = fs.readFileSync(EMBEDDINGS_FILE, "utf8");
      const documents = JSON.parse(data) as DocumentWithEmbedding[];
      console.log(
        `📦 Loaded ${documents.length} documents from ${EMBEDDINGS_FILE}`
      );
      return documents;
    }
    console.log("📦 No existing embeddings file found");
    return [];
  } catch (error) {
    console.error("Error loading stored documents:", error);
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findRelevantDocs(question: string, maxResults: number = 3) {
  console.log(`🔍 Searching for documents related to: "${question}"`);

  const storedDocuments = loadStoredDocuments();

  if (storedDocuments.length === 0) {
    console.log("❌ No documents found in ChromaDB");
    return {};
  }

  try {
    console.log("⏳ Creating embedding for question...");
    const questionEmbedding = await createEmbedding(question);

    const similarities = storedDocuments.map((doc) => ({
      ...doc,
      similarity: cosineSimilarity(questionEmbedding, doc.embedding),
    }));

    const topDocs = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    console.log(`📄 Found ${topDocs.length} relevant documents`);

    topDocs.forEach((doc) => {
      console.log(
        `  - ${doc.fileName} (Similarity: ${doc.similarity.toFixed(4)})`
      );
    });

    const relevantDocs: { [fileName: string]: string } = {};
    topDocs.forEach((doc) => {
      relevantDocs[doc.fileName] = doc.content;
    });

    return relevantDocs;
  } catch (error) {
    console.error("❌ Error finding relevant documents:", error);
    return {};
  }
}

async function askQuestion(question: string): Promise<string> {
  try {
    const relevantDocs = await findRelevantDocs(question, 3);

    if (Object.keys(relevantDocs).length === 0) {
      return "❌ Could not find relevant documents to answer your question.";
    }

    let allContent = "";
    for (const [fileName, content] of Object.entries(relevantDocs)) {
      allContent += `\n--- ${fileName} ---\n${content}\n`;
    }

    console.log(
      `📤 Sending ${Object.keys(relevantDocs).length} documents to OpenAI`
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
    return "An error occurred while answering the question.";
  }
}

async function main() {
  const command = process.argv[2];

  if (command === "load") {
    console.log("📁 Creating embeddings and storing documents...");
    const documents = readAllDocuments("./docs");

    if (Object.keys(documents).length === 0) {
      console.error("❌ No documents found to load!");
      console.log("💡 Please create a 'docs' folder with .txt or .md files");
      return;
    }

    await storeDocuments(documents);
    console.log("🎉 Documents loaded successfully! You can now ask questions.");
  } else if (command === "clear") {
    if (fs.existsSync(EMBEDDINGS_FILE)) {
      fs.unlinkSync(EMBEDDINGS_FILE);
      console.log(`🧹 Cleared ${EMBEDDINGS_FILE}`);
    } else {
      console.log("📦 No embeddings file found to clear");
    }
  } else {
    const question = command || "What topics are covered in the documents?";
    console.log(`❓ Question: ${question}`);
    console.log("🤔 Thinking...");

    const answer = await askQuestion(question);
    console.log(`💡 Answer: ${answer}`);
  }
}

main();
