
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import studioRoutes from "./routes/studio.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);

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

    const PORT = Number(process.env.PORT) || 4000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
