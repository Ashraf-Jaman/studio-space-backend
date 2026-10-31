import { Router } from "express";
import { createStudio,getAllStudios,getStudioById,updateStudio,deleteStudio, } from "../controllers/studio.controller.js";

const router = Router();

router.get("/", getAllStudios);
router.post("/", createStudio);
router.get("/:id", getStudioById);
router.patch("/:id", updateStudio);
router.delete("/:id", deleteStudio);

export default router;
