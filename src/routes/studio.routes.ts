import { Router } from "express";
import { createStudio,getAllStudios,getStudioById,updateStudio,deleteStudio, } from "../controllers/studio.controller.js";
import { verifyAuth } from "../middleware/auth.middleware.js";

const router = Router();


router.get("/", getAllStudios);
router.post("/", verifyAuth, createStudio);
router.get("/:id", getStudioById);
router.patch("/:id", verifyAuth, updateStudio);
router.delete("/:id", verifyAuth, deleteStudio);


export default router;
