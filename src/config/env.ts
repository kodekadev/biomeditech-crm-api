import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  GCP_PROJECT_ID: z.string().default("jobs-425301"),
  BIGQUERY_DATASET: z.string().default("CRM"),
  BIGQUERY_LOCATION: z.string().default("us-central1")
});

export const env = envSchema.parse(process.env);

