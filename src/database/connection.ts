import { Pool } from "pg";

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database connected successfully:", result.rows[0].now);
    client.release();
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:", error);
    throw error;
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    console.log("🔧 Initializing database schema...");

    // Create vector extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log("✅ Vector extension enabled");

    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_filename UNIQUE (filename)
      );
    `);
    console.log("✅ Documents table created");

    // Create vector index for fast similarity search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS documents_embedding_idx 
      ON documents USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    console.log("✅ Vector index created");

    // Create filename index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS documents_filename_idx 
      ON documents (filename);
    `);
    console.log("✅ Filename index created");

    console.log("✅ Database schema initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await pool.end();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error closing database connection:", error);
  }
}
