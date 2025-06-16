import { Request, Response, NextFunction } from "express";

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("❌ Express error:", error);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
}
