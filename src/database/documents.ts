import dotenv from "dotenv";
import { pool } from "./connection";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FullDocumentResult {
  originalFilename: string;
  fullContent: string;
  similarity: number;
  googleDriveId?: string;
  chunkCount: number;
}

export interface DocumentResult {
  id: number;
  chunkName: string;
  originalFilename: string;
  content: string;
  similarity: number;
  createdAt: Date;
  googleDriveId?: string;
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

// Find relevant full documents using vector similarity
export async function findRelevantFullDocuments(
  question: string,
  maxDocuments: number = 3,
  similarityThreshold: number = 0.0
): Promise<FullDocumentResult[]> {
  try {
    console.log(`🔍 Searching for full documents related to: "${question}"`);

    const questionEmbedding = await createEmbedding(question);
    const vectorString = `[${questionEmbedding.join(",")}]`;

    // First, find the most relevant chunks
    const result = await pool.query(
      `
      SELECT 
        original_filename,
        chunk_name,
        google_drive_id,
        embedding <=> $1::vector as distance
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [vectorString, maxDocuments * 20] // Get more chunks
    );

    console.log(`📊 Found ${result.rows.length} chunks, showing distances:`);
    result.rows.forEach((row, index) => {
      const distance = parseFloat(row.distance);
      const similarity = 1 - distance;
      console.log(
        `  ${index + 1}. ${row.original_filename} (${
          row.chunk_name
        }): distance = ${distance.toFixed(
          4
        )}, similarity = ${similarity.toFixed(4)}`
      );
    });

    // Group by document and get the best similarity score for each
    const documentScores = new Map<
      string,
      { distance: number; googleDriveId?: string }
    >();

    for (const row of result.rows) {
      const filename = row.original_filename;
      const distance = parseFloat(row.distance);
      const similarity = 1 - distance; // 0~2

      // Only consider documents above the threshold
      if (similarity >= similarityThreshold) {
        if (
          !documentScores.has(filename) ||
          distance < documentScores.get(filename)!.distance
        ) {
          documentScores.set(filename, {
            distance,
            googleDriveId: row.google_drive_id,
          });
        }
      }
    }

    // Get the top documents
    const topDocuments = Array.from(documentScores.entries())
      .sort((a, b) => a[1].distance - b[1].distance)
      .slice(0, maxDocuments);

    // If no documents meet the threshold, return empty array
    if (topDocuments.length === 0) {
      console.log(
        `⚠️ No documents met similarity threshold of ${similarityThreshold}`
      );
      return [];
    }

    // Retrieve full content for each document
    const fullDocuments: FullDocumentResult[] = [];

    for (const [filename, { distance, googleDriveId }] of topDocuments) {
      const contentResult = await pool.query(
        `
        SELECT content 
        FROM documents 
        WHERE original_filename = $1 
        ORDER BY id
        `,
        [filename]
      );

      const fullContent = contentResult.rows
        .map((row) => row.content)
        .join("\n\n");

      fullDocuments.push({
        originalFilename: filename,
        fullContent,
        similarity: 1 - distance,
        googleDriveId,
        chunkCount: contentResult.rows.length,
      });
    }

    console.log(
      `📄 Found ${fullDocuments.length} relevant full documents (threshold: ${similarityThreshold})`
    );
    fullDocuments.forEach((doc, index) => {
      console.log(
        `  ${index + 1}. ${
          doc.originalFilename
        } (Similarity: ${doc.similarity.toFixed(4)}, Chunks: ${doc.chunkCount})`
      );
    });

    return fullDocuments;
  } catch (error) {
    console.error("❌ Error in findRelevantFullDocuments:", error);
    return [];
  }
}
