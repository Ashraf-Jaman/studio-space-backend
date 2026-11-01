import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../config/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await getAuth().api.getSession({
      headers: req.headers,
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Unauthorized! Please login first.",
      });
      return;
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }
};