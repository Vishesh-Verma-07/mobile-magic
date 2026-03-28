import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization;

  if (!token) {
    res.status(400).json({ message: "Unauthorised" });
    return;
  }

  const decode = jwt.verify(token, process.env.JWT_PUBLIC_KEY!,{
    algorithms: ["RS256"],
  }
  );

  if(!decode) {
    res.status(400).json({ message: "Unauthorised" });
    return;
  }

  const userId = decode.sub as string;

  if(!userId) {
    res.status(400).json({ message: "Unauthorised" });
    return;
  } 

  req.userId = decode.sub as string;
  next();
}
