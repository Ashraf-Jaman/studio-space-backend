import { Router } from "express";
import { createBooking,getMyBookings,cancelBooking, } from "../controllers/booking.controller.js";

const router = Router();

router.post("/", createBooking);
router.get("/user/:userId", getMyBookings);
router.patch("/:id/cancel", cancelBooking);

export default router;
