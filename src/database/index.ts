// Export all database functions from a single entry point
export {
  pool,
  testConnection,
  initializeDatabase,
  closeConnection,
} from "./connection";

export {
  DocumentResult,
  createEmbedding,
  documentExists,
  storeDocument,
  storeDocuments,
  findRelevantDocs,
  getDocumentCount,
  clearDocuments,
  listDocuments,
} from "./documents";
