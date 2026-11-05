import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectDB } from "./config/db.js";
import { initAuth } from "./config/auth.js";

import studioRoutes from "./routes/studio.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

const app = express();

// Home Route
app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to StudioSpace API!");
});

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "StudioSpace Backend is Running!",
  });
});

let initializePromise: Promise<void> | undefined;

const initializeApp = (): Promise<void> => {
  if (!initializePromise) {
    initializePromise = (async () => {
    await connectDB();

    // Initialize Better Auth after MongoDB connection
    const auth = initAuth();

    // CORS
    app.use(
      cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
      })
    );

    // Better Auth handler must be before body parsers
    app.all("/api/auth/{*any}", toNodeHandler(auth));

    // Body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API Routes
    app.use("/api/studios", studioRoutes);
    app.use("/api/bookings", bookingRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/wishlist", wishlistRoutes);

      console.log("Better Auth is ready!");
    })();
  }

  return initializePromise;
};

/** Vercel serverless entry point. */
export default async function handler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await initializeApp();
    app(req, res, next);
  } catch (error) {
    console.error("Server startup failed:", error);
    res.status(500).json({ success: false, message: "Server initialization failed" });
  }
}

// A serverless platform invokes the default handler. Keep local development
// convenient by listening only when this module is executed directly.
if (!process.env.VERCEL) {
  initializeApp()
    .then(() => {
      const port = Number(process.env.PORT) || 4000;
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((error: unknown) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}
