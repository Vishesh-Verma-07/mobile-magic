import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const publicKey = process.env.JWT_PUBLIC_KEY;

  if (!publicKey) {
    res.status(500).json({ message: "JWT_PUBLIC_KEY is not configured" });
    return;
  }

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorised" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ message: "Unauthorised" });
    return;
  }

  try {
    const decode = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });

    if (!decode || typeof decode === "string") {
      res.status(401).json({ message: "Unauthorised" });
      return;
    }

    const userId = decode.sub;

    if (!userId || typeof userId !== "string") {
      res.status(401).json({ message: "Unauthorised" });
      return;
    }

    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorised" });
  }
}
