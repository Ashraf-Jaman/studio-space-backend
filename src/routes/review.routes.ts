
import { Router } from "express";
import { createReview,getStudioReviews,updateReview,deleteReview, } from "../controllers/review.controller.js";

const router = Router();

router.post("/", createReview);
router.get("/studio/:studioId", getStudioReviews);
router.patch("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
