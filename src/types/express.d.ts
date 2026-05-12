import type { BigQueryRepository } from "../bigquery/repository.js";

declare global {
  namespace Express {
    interface Request {
      repository: BigQueryRepository;
    }
  }
}

export {};

