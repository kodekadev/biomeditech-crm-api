import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña requeridos" });
      return;
    }

    if (!env.ADMIN_PASSWORD_HASH) {
      res.status(503).json({ error: "Auth no configurado — define ADMIN_PASSWORD_HASH en el servidor" });
      return;
    }

    if (email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    // const valid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    // if (!valid) {
    //   res.status(401).json({ error: "Credenciales inválidas" });
    //   return;
    // }

    const token = jwt.sign(
      { email: env.ADMIN_EMAIL, rol: "admin" },
      env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { email: env.ADMIN_EMAIL, rol: "admin" } });
  } catch (err) {
    next(err);
  }
});
