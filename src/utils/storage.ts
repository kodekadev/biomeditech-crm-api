import { Storage } from "@google-cloud/storage";
import { env } from "../config/env.js";

const storage = new Storage({ projectId: env.GCP_PROJECT_ID });

export async function uploadPdf(filename: string, buffer: Buffer): Promise<string> {
  const bucket = storage.bucket(env.GCS_BUCKET);
  const file = bucket.file(`cotizaciones/${filename}`);

  await file.save(buffer, {
    metadata: { contentType: "application/pdf" },
    public: true,
  });

  return `https://storage.googleapis.com/${env.GCS_BUCKET}/cotizaciones/${filename}`;
}
