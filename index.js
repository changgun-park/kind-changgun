"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const EMBEDDINGS_FILE = "./embeddings.json";
function readAllDocuments(docsPath) {
    const documents = {};
    try {
        if (!fs_1.default.existsSync(docsPath)) {
            console.error(`Directory ${docsPath} does not exist.`);
            return {};
        }
        const files = fs_1.default.readdirSync(docsPath);
        console.log(`📁 Found ${files.length} files in ${docsPath}`);
        for (const file of files) {
            if (file.endsWith("txt") || file.endsWith("md")) {
                try {
                    const filePath = path_1.default.join(docsPath, file);
                    const content = fs_1.default.readFileSync(filePath, "utf8");
                    documents[file] = content;
                    console.log(`✅ Loaded: ${file}`);
                }
                catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }
        }
        console.log(`📚 Total documents loaded: ${Object.keys(documents).length}`);
        return documents;
    }
    catch (error) {
        console.error("Error reading documents:", error);
        return {};
    }
}
async function createEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        return response.data[0].embedding;
    }
    catch (error) {
        console.error("Error creating embedding:", error);
        throw error;
    }
}
async function storeDocuments(documents) {
    console.log("🔍 Creating embeddings and storing documents...");
    const documentsWithEmbedding = [];
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
        fs_1.default.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(documentsWithEmbedding, null, 2));
        console.log(`💾 Saved ${documentsWithEmbedding.length} documents to ${EMBEDDINGS_FILE}`);
        console.log("✅ All documents processed and stored!");
    }
    catch (error) {
        console.error("❌ Error storing documents in ChromaDB:", error);
    }
}
function loadStoredDocuments() {
    try {
        if (fs_1.default.existsSync(EMBEDDINGS_FILE)) {
            const data = fs_1.default.readFileSync(EMBEDDINGS_FILE, "utf8");
            const documents = JSON.parse(data);
            console.log(`📦 Loaded ${documents.length} documents from ${EMBEDDINGS_FILE}`);
            return documents;
        }
        console.log("📦 No existing embeddings file found");
        return [];
    }
    catch (error) {
        console.error("Error loading stored documents:", error);
        return [];
    }
}
function cosineSimilarity(a, b) {
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
async function findRelevantDocs(question, maxResults = 3) {
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
            console.log(`  - ${doc.fileName} (Similarity: ${doc.similarity.toFixed(4)})`);
        });
        const relevantDocs = {};
        topDocs.forEach((doc) => {
            relevantDocs[doc.fileName] = doc.content;
        });
        return relevantDocs;
    }
    catch (error) {
        console.error("❌ Error finding relevant documents:", error);
        return {};
    }
}
async function askQuestion(question) {
    try {
        const relevantDocs = await findRelevantDocs(question, 3);
        if (Object.keys(relevantDocs).length === 0) {
            return "❌ Could not find relevant documents to answer your question.";
        }
        let allContent = "";
        for (const [fileName, content] of Object.entries(relevantDocs)) {
            allContent += `\n--- ${fileName} ---\n${content}\n`;
        }
        console.log(`📤 Sending ${Object.keys(relevantDocs).length} documents to OpenAI`);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Answer questions based on the provided documents. Always mention which document contains the information. If the answer isn't in any document, say 'I don't know.'",
                },
                {
                    role: "user",
                    content: `Documents: ${allContent}\n\nQuestion: ${question}`,
                },
            ],
            temperature: 0.1,
        });
        return response.choices[0].message.content || "No answer provided";
    }
    catch (error) {
        console.error("❌ Error asking question:", error);
        return "An error occurred while answering the question.";
    }
}
async function main() {
    const command = process.argv[2];
    if (command === "server" ||
        (!command && process.env.NODE_ENV === "production")) {
        console.log("🚀 Starting server...");
        loadStoredDocuments();
    }
    else if (command === "load") {
        console.log("📁 Creating embeddings and storing documents...");
        const documents = readAllDocuments("./docs");
        if (Object.keys(documents).length === 0) {
            console.error("❌ No documents found to load!");
            console.log("💡 Please create a 'docs' folder with .txt or .md files");
            return;
        }
        await storeDocuments(documents);
        console.log("🎉 Documents loaded successfully! You can now ask questions.");
    }
    else if (command === "clear") {
        if (fs_1.default.existsSync(EMBEDDINGS_FILE)) {
            fs_1.default.unlinkSync(EMBEDDINGS_FILE);
            console.log(`🧹 Cleared ${EMBEDDINGS_FILE}`);
        }
        else {
            console.log("📦 No embeddings file found to clear");
        }
    }
    else {
        const question = command || "What topics are covered in the documents?";
        console.log(`❓ Question: ${question}`);
        console.log("🤔 Thinking...");
        const answer = await askQuestion(question);
        console.log(`💡 Answer: ${answer}`);
    }
}
main();
