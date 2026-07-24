import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { resourceRouter } from "./routes/resource.routes.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  app.use(cors({ origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  }}));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "biomeditech-crm-api",
      environment: env.NODE_ENV
    });
  });

  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/integrations", integrationRouter);
  app.use("/api", resourceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
