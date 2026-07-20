import type { Request, Response, NextFunction } from "express";
import { validateAdminToken } from "../lib/adminSessions";

/**
 * Express middleware that requires a valid admin session token.
 * Token must be supplied as:  Authorization: Bearer <token>
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  if (!validateAdminToken(token)) {
    res.status(401).json({ error: "Invalid or expired admin token" });
    return;
  }
  next();
}
