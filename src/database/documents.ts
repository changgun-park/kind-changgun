import { pool } from "./connection";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentResult {
  id: number;
  fileName: string;
  content: string;
  similarity: number;
  createdAt: Date;
}

// Create embedding using OpenAI
export async function createEmbedding(text: string): Promise<number[]> {
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

// Check if document exists in database
export async function documentExists(fileName: string): Promise<boolean> {
  try {
    const result = await pool.query(
      "SELECT id FROM documents WHERE filename = $1 LIMIT 1",
      [fileName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking document existence:", error);
    return false;
  }
}

// Store a single document in PostgreSQL
export async function storeDocument(
  fileName: string,
  content: string
): Promise<void> {
  try {
    console.log(`⏳ Processing ${fileName}...`);

    // Create embedding
    const embedding = await createEmbedding(content);

    // Check if document already exists
    if (await documentExists(fileName)) {
      console.log(`⚠️  Document ${fileName} already exists, updating...`);

      // Update existing document
      await pool.query(
        `
        UPDATE documents 
        SET content = $1, embedding = $2, updated_at = NOW()
        WHERE filename = $3
      `,
        [content, embedding, fileName]
      );

      console.log(`✅ Updated: ${fileName}`);
    } else {
      // Insert new document
      await pool.query(
        `
        INSERT INTO documents (filename, content, embedding)
        VALUES ($1, $2, $3)
      `,
        [fileName, content, embedding]
      );

      console.log(`✅ Stored: ${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Error storing document ${fileName}:`, error);
    throw error;
  }
}

// Store multiple documents
export async function storeDocuments(documents: {
  [fileName: string]: string;
}): Promise<void> {
  console.log("🔍 Creating embeddings and storing documents in PostgreSQL...");

  try {
    for (const [fileName, content] of Object.entries(documents)) {
      await storeDocument(fileName, content);
    }

    console.log("✅ All documents processed and stored in PostgreSQL!");
  } catch (error) {
    console.error("❌ Error storing documents:", error);
    throw error;
  }
}

// Find relevant documents using vector similarity
export async function findRelevantDocs(
  question: string,
  maxResults: number = 3
): Promise<DocumentResult[]> {
  try {
    console.log(`🔍 Searching for documents related to: "${question}"`);

    // Create embedding for the question
    const questionEmbedding = await createEmbedding(question);

    // Search for similar documents using vector similarity
    const result = await pool.query(
      `
      SELECT 
        id,
        filename,
        content,
        1 - (embedding <=> $1::vector) as similarity,
        created_at
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
      [questionEmbedding, maxResults]
    );

    const documents: DocumentResult[] = result.rows.map((row) => ({
      id: row.id,
      fileName: row.filename,
      content: row.content,
      similarity: parseFloat(row.similarity),
      createdAt: row.created_at,
    }));

    console.log(`📄 Found ${documents.length} relevant documents`);
    documents.forEach((doc) => {
      console.log(
        `  - ${doc.fileName} (Similarity: ${doc.similarity.toFixed(4)})`
      );
    });

    return documents;
  } catch (error) {
    console.error("❌ Error finding relevant documents:", error);
    return [];
  }
}

// Get document count from database
export async function getDocumentCount(): Promise<number> {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM documents");
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error("Error getting document count:", error);
    return 0;
  }
}

// Clear all documents from database
export async function clearDocuments(): Promise<void> {
  try {
    await pool.query("DELETE FROM documents");
    console.log("🧹 Cleared all documents from database");
  } catch (error) {
    console.error("❌ Error clearing documents:", error);
    throw error;
  }
}

// List all documents in database
export async function listDocuments(): Promise<
  Array<{ filename: string; createdAt: Date; updatedAt: Date }>
> {
  try {
    const result = await pool.query(`
      SELECT filename, created_at, updated_at 
      FROM documents 
      ORDER BY updated_at DESC
    `);

    return result.rows.map((row) => ({
      filename: row.filename,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("❌ Error listing documents:", error);
    return [];
  }
}
