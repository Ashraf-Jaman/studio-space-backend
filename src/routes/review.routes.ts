import { Router } from "express";

import {
  createReview,
  getStudioReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

import { verifyAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public route
router.get("/studio/:studioId", getStudioReviews);

// Protected routes
router.post("/", verifyAuth, createReview);
router.patch("/:id", verifyAuth, updateReview);
router.delete("/:id", verifyAuth, deleteReview);

export default router;