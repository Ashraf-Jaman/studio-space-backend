import { Router } from "express";
import {
  createStudio,
  getAllStudios,
  getStudioById,
  updateStudio,
  deleteStudio,
  getOwnerDashboard,
} from "../controllers/studio.controller.js";
import { requireRoles, verifyAuth } from "../middleware/auth.middleware.js";

const router = Router();


router.get("/", getAllStudios);

router.post("/", verifyAuth, requireRoles("studio_owner", "admin"), createStudio);

router.get("/owner/dashboard", verifyAuth, requireRoles("studio_owner", "admin"), getOwnerDashboard);

router.get("/:id", getStudioById);
router.patch("/:id", verifyAuth, requireRoles("studio_owner", "admin"), updateStudio);
router.delete("/:id", verifyAuth, requireRoles("studio_owner", "admin"), deleteStudio);


export default router;
