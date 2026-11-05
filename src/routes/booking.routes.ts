import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  cancelBooking,
  completeBooking,
  confirmBooking,
  getOwnerRecentBookings,
  checkStudioAvailability,
} from "../controllers/booking.controller.js";

import { requireRoles, verifyAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", verifyAuth, requireRoles("customer", "admin"), createBooking);

router.get("/my", verifyAuth, getMyBookings);

router.get("/owner/recent", verifyAuth, requireRoles("studio_owner", "admin"), getOwnerRecentBookings);
router.get("/availability", checkStudioAvailability);

router.patch("/:id/cancel", verifyAuth, cancelBooking);

router.patch("/:id/complete", verifyAuth, requireRoles("studio_owner", "admin"), completeBooking);

router.patch("/:id/confirm", verifyAuth, requireRoles("studio_owner", "admin"), confirmBooking);

export default router;
