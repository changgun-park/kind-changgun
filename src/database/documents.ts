import dotenv from "dotenv";
import { pool } from "./connection";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentResult {
  id: number;
  chunkName: string;
  originalFilename: string;
  content: string;
  similarity: number;
  createdAt: Date;
}

// Create embedding using OpenAI
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error creating embedding:", error);
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

    const totalDocs = await getDocumentCount();
    console.log(`📦 Database contains ${totalDocs} documents`);

    if (totalDocs === 0) {
      console.log("⚠️ No documents found in database.");
      return [];
    }

    // Create embedding for the question
    const questionEmbedding = await createEmbedding(question);

    // Convert array to PostgreSQL vector format
    const vectorString = `[${questionEmbedding.join(",")}]`;

    try {
      const result = await pool.query(
        `
        SELECT 
          id,
          chunk_name,
          original_filename,
          content,
          embedding <=> $1::vector as distance
        FROM documents
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `,
        [vectorString, maxResults]
      );

      console.log(`✅ Query returned ${result.rows.length} rows`);

      if (result.rows.length > 0) {
        console.log("📊 Distance values:");
        result.rows.forEach((row, index) => {
          console.log(
            `  ${index + 1}. ${row.filename}: distance = ${row.distance}`
          );
        });
      }

      const documents: DocumentResult[] = result.rows.map((row) => ({
        id: row.id,
        chunkName: row.chunk_name,
        originalFilename: row.original_filename,
        content: row.content,
        similarity: 1 - parseFloat(row.distance),
        createdAt: new Date(),
      }));

      console.log(`📄 Found ${documents.length} relevant documents`);
      documents.forEach((doc, index) => {
        console.log(
          `  ${index + 1}. ${
            doc.originalFilename
          } (Similarity: ${doc.similarity.toFixed(4)})`
        );
        console.log(
          `     Content preview: ${doc.content.substring(0, 100)}...`
        );
      });

      return documents;
    } catch (error) {
      console.error("❌ Query failed:", error);
      console.error("Error details:", (error as Error).message);
      return [];
    }
  } catch (error) {
    console.error("❌ Error in findRelevantDocs:", error);
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

// List all documents in database
export async function listDocuments(): Promise<
  Array<{ originalFilename: string; createdAt: Date; updatedAt: Date }>
> {
  try {
    const result = await pool.query(`
      SELECT original_filename, created_at, updated_at 
      FROM documents 
      ORDER BY updated_at DESC
    `);

    return result.rows.map((row) => ({
      originalFilename: row.original_filename,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("❌ Error listing documents:", error);
    return [];
  }
}
