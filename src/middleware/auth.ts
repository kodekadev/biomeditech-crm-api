import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthPayload {
  id: string;
  email: string;
  rol: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  try {
    const token = header.slice(7);
    (req as Request & { user: AuthPayload }).user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}
