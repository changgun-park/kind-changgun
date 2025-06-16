import dotenv from "dotenv";
import { createApp } from "./app";
import {
  testConnection,
  initializeDatabase,
  closeConnection,
  getDocumentCount,
} from "./database";
import { Express } from "express";

dotenv.config();

export class Server {
  private app: Express;
  private server?: any;

  constructor() {
    this.app = createApp();
  }

  async start(): Promise<void> {
    try {
      // Database initialization
      await this.initializeDatabase();

      // Start HTTP server
      await this.startHttpServer();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log("🎉 Slack bot server started successfully!");
    } catch (error) {
      console.error("❌ Server startup failed:", error);
      process.exit(1);
    }
  }

  private async initializeDatabase(): Promise<void> {
    console.log("🔄 Testing database connection...");
    await testConnection();

    console.log("🔧 Ensuring database schema is initialized...");
    await initializeDatabase();

    const dbCount = await getDocumentCount();
    console.log(`📦 Database contains ${dbCount} documents`);

    if (dbCount === 0) {
      console.log("💡 Database is empty. Use scripts to load documents:");
      console.log("   npm run load-docs");
    }
  }

  private async startHttpServer(): Promise<void> {
    const port = parseInt(process.env.PORT || "3000");

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`🚀 HTTP server listening on port ${port}`);
        resolve();
      });
    });
  }

  private setupGracefulShutdown(): void {
    const signals = ["SIGINT", "SIGTERM"];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`🛑 Received ${signal}, shutting down gracefully...`);

        if (this.server) {
          this.server.close(async () => {
            console.log("✅ HTTP server closed");
            await closeConnection();
            console.log("✅ Database connection closed");
            process.exit(0);
          });
        } else {
          await closeConnection();
          process.exit(0);
        }
      });
    });
  }
}
