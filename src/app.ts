import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { slackRouter } from "./routes/slack";
import { errorHandler, notFoundHandler } from "./middleware/error-handlers";
import { requestLogger } from "./middleware/logger";

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Request parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Logging
  app.use(requestLogger);

  // Routes
  app.use("/health", healthRouter);
  app.use("/slack", slackRouter);

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
