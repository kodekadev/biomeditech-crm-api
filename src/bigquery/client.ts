import { BigQuery } from "@google-cloud/bigquery";
import { env } from "../config/env.js";

export const bigquery = new BigQuery({
  projectId: env.GCP_PROJECT_ID,
  location: env.BIGQUERY_LOCATION
});

export const datasetId = env.BIGQUERY_DATASET;
export const projectId = env.GCP_PROJECT_ID;

export const tableRef = (table: string) => {
  return `\`${projectId}.${datasetId}.${table}\``;
};

export const table = (table: string) => {
  return bigquery.dataset(datasetId).table(table);
};
