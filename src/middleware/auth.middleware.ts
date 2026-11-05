import "dotenv/config";

import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { UserRole } from "../types/user.js";

const USER_ROLES: readonly UserRole[] = ["customer", "studio_owner", "admin"];

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

const baseURL = process.env.BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is missing!");
}

const JWKS = createRemoteJWKSet(
  new URL(`${baseURL}/api/auth/jwks`)
);

export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authorization token missing!",
      });
      return;
    }

    const token = authHeader.slice(7);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: baseURL,
      audience: baseURL,
    });

    if (typeof payload.sub !== "string") {
      res.status(401).json({
        success: false,
        message: "Invalid token payload!",
      });
      return;
    }

    req.user = {
      id: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
      // Unknown or missing claims must never grant elevated access.
      role: USER_ROLES.includes(payload.role as UserRole)
        ? (payload.role as UserRole)
        : "customer",
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/** Require at least one of the supplied roles. Use after verifyAuth. */
export const requireRoles = (...allowedRoles: UserRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
