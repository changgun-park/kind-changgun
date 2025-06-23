// Export all database functions from a single entry point
export { pool, testConnection, closeConnection } from "./connection";

export {
  DocumentResult,
  createEmbedding,
  findRelevantFullDocuments,
  getDocumentCount,
  listDocuments,
} from "./documents";
