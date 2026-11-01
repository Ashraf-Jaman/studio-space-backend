import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import {
  getWishlistsCollection,
  getStudiosCollection,
} from "../config/db.js";

export const addToWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, studioId } = req.body;

    if (!userId || !studioId) {
      res.status(400).json({
        success: false,
        message: "User ID and Studio ID are required",
      });
      return;
    }

    if (!ObjectId.isValid(studioId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Studio ID",
      });
      return;
    }

    const studio = await getStudiosCollection().findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      res.status(404).json({
        success: false,
        message: "Studio not found",
      });
      return;
    }

    const existingWishlist = await getWishlistsCollection().findOne({
      userId,
      studioId: new ObjectId(studioId),
    });

    if (existingWishlist) {
      res.status(409).json({
        success: false,
        message: "Studio already exists in wishlist",
      });
      return;
    }

    const result = await getWishlistsCollection().insertOne({
      userId,
      studioId: new ObjectId(studioId),
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Studio added to wishlist successfully",
      wishlistId: result.insertedId,
    });
  } catch (error) {
    console.error("Add wishlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add studio to wishlist",
    });
  }
};


export const getMyWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    const wishlist = await getWishlistsCollection()
      .aggregate([
        {
          $match: { userId },
        },
        {
          $lookup: {
            from: "studios",
            localField: "studioId",
            foreignField: "_id",
            as: "studio",
          },
        },
        {
          $unwind: {
            path: "$studio",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      total: wishlist.length,
      data: wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};

export const removeFromWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid Wishlist ID",
      });
      return;
    }

    const result = await getWishlistsCollection().deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Studio removed from wishlist successfully",
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove studio from wishlist",
    });
  }
};