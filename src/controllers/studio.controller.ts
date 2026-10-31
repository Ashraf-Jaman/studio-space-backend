
import type { Request, Response } from "express";
import { getStudiosCollection } from "../config/db.js";

export const getAllStudios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const studios = await getStudiosCollection()
      .find({})
      .toArray();

    res.status(200).json({
      success: true,
      message: "Studios fetched successfully",
      data: studios,
    });
  } catch (error) {
    console.error("Get studios error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studios",
    });
  }
};
