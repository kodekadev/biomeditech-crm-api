import { Router } from "express";
import { getTableConfig } from "../config/tables.js";
import { BigQueryRepository } from "../bigquery/repository.js";
import { asyncHandler, HttpError } from "../http/errors.js";

export const resourceRouter = Router();

const getId = (value: string | string[]) => {
  if (Array.isArray(value)) {
    throw new HttpError(400, "Parametro id invalido");
  }

  return value;
};

resourceRouter.param("resource", (req, _res, next, resource) => {
  const config = getTableConfig(resource);
  if (!config) {
    return next(new HttpError(404, "Recurso no configurado"));
  }

  req.repository = new BigQueryRepository(config);
  next();
});

resourceRouter.get(
  "/:resource",
  asyncHandler(async (req, res) => {
    const rows = await req.repository.list(req.query);
    res.json({ data: rows });
  })
);

resourceRouter.get(
  "/:resource/:id",
  asyncHandler(async (req, res) => {
    const row = await req.repository.getById(getId(req.params.id));
    if (!row) {
      throw new HttpError(404, "Registro no encontrado");
    }

    res.json({ data: row });
  })
);

resourceRouter.post(
  "/:resource",
  asyncHandler(async (req, res) => {
    const row = await req.repository.create(req.body);
    res.status(201).json({ data: row });
  })
);

resourceRouter.patch(
  "/:resource/:id",
  asyncHandler(async (req, res) => {
    const row = await req.repository.update(getId(req.params.id), req.body);
    res.json({ data: row });
  })
);

resourceRouter.delete(
  "/:resource/:id",
  asyncHandler(async (req, res) => {
    const result = await req.repository.delete(getId(req.params.id));
    res.json({ data: result });
  })
);
