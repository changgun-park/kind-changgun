import { Router } from "express";
import { testConnection, getDocumentCount } from "../database";

export const healthRouter = Router();

// Simple health check without database
healthRouter.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    message: "App is running (no database check)",
  });
});
