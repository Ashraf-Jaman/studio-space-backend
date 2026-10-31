import { Router } from "express";
import { getAllStudios } from "../controllers/studio.controller.js";

const router = Router();

router.get("/", getAllStudios);

export default router;