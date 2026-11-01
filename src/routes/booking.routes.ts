import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  cancelBooking,
  completeBooking,
  confirmBooking,
} from "../controllers/booking.controller.js";

import { verifyAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyAuth, createBooking);

router.get("/my", verifyAuth, getMyBookings);

router.patch("/:id/cancel", verifyAuth, cancelBooking);

router.patch("/:id/complete", verifyAuth, completeBooking);

router.patch("/:id/confirm", verifyAuth, confirmBooking);

export default router;