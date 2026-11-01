import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Request, Response } from "express";
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
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to StudioSpace API!");
});

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "StudioSpace Backend is Running!",
  });
});

// Start Server
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    // Initialize Better Auth after MongoDB connection
    const auth = initAuth();

    // CORS
    app.use(
      cors({
        origin: "http://localhost:3000",
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

    const PORT = Number(process.env.PORT) || 4000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Better Auth is ready!");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
