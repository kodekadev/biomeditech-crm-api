import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { bigquery, tableRef } from "../bigquery/client.js";
import { env } from "../config/env.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña requeridos" });
      return;
    }

    const [rows] = await bigquery.query({
      query: `SELECT id, email, rol, password_hash FROM ${tableRef("usuarios")} WHERE LOWER(email) = LOWER(@email) AND activo = true LIMIT 1`,
      params: { email },
    });

    const user = rows[0];
    if (!user || !user.password_hash) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, String(user.password_hash));
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    bigquery.query({
      query: `UPDATE ${tableRef("usuarios")} SET ultimo_acceso = @now WHERE id = @id`,
      params: { now: new Date().toISOString(), id: String(user.id) },
    }).catch(() => {});

    const token = jwt.sign(
      { id: String(user.id), email: String(user.email), rol: String(user.rol) },
      env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { id: String(user.id), email: String(user.email), rol: String(user.rol) } });
  } catch (err) {
    next(err);
  }
});
