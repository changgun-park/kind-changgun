import { Router } from "express";
import { testConnection, getDocumentCount } from "../database";

export const healthRouter = Router();

healthRouter.get("/", async (req, res) => {
  try {
    await testConnection();
    const dbCount = await getDocumentCount();

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "connected",
        documentsLoaded: dbCount,
      },
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});
