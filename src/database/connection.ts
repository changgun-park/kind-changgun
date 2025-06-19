import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

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

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await pool.end();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error closing database connection:", error);
  }
}
