import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function getUserId(req: Request) {
  const auth = getAuth(req);
  return auth?.userId ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getUserId(req)) {
    res.status(401).json({ error: "Please sign in to access this account." });
    return;
  }
  next();
}

export function isConfiguredAdmin(userId: string): boolean {
  const configuredIds = (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configuredIds.includes(userId);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please sign in to access practice administration." });
    return;
  }

  if (!isConfiguredAdmin(userId)) {
    res.status(403).json({ error: "This account is not authorised for practice administration." });
    return;
  }

  req.log.debug({ userId }, "Authenticated admin request");
  next();
}