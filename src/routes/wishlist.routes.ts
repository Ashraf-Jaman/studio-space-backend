import { Router } from "express";

import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
} from "../controllers/wishlist.controller.js";

const router = Router();

router.post("/", addToWishlist);
router.get("/user/:userId", getMyWishlist);
router.delete("/:id", removeFromWishlist);

export default router;