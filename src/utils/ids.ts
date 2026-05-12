import { randomUUID } from "node:crypto";

export const createId = (prefix: string) => {
  const id = randomUUID().split("-")[0].toUpperCase();
  return `${prefix}-${id}`;
};

