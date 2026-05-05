import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GCP_PROJECT_ID: z.string().default("jobs-425301"),
  BIGQUERY_DATASET: z.string().default("CRM"),
  BIGQUERY_LOCATION: z.string().default("us-central1"),
  JWT_SECRET: z.string().default("dev-secret-change-in-production"),
  ADMIN_EMAIL: z.string().default("admin@biomeditech.cl"),
  ADMIN_PASSWORD_HASH: z.string().optional(),
});

export const env = envSchema.parse(process.env);

