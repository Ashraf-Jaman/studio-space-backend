
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import {
  getReviewsCollection,
  getBookingsCollection,
  getStudiosCollection,
} from "../config/db.js";


export const createReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studioId,
      userId,
      bookingId,
      rating,
      comment,
    } = req.body;

    // Validate required fields
    if (
      !studioId ||
      !userId ||
      !bookingId ||
      rating == null ||
      !comment?.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    // Validate IDs
    if (
      !ObjectId.isValid(studioId) ||
      !ObjectId.isValid(bookingId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid Studio or Booking ID",
      });
      return;
    }

    // Validate rating
    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
      return;
    }

    // Check Studio
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

    // Check completed booking
    const booking = await getBookingsCollection().findOne({
      _id: new ObjectId(bookingId),
      studioId: new ObjectId(studioId),
      userId,
      status: "completed",
    });

    if (!booking) {
      res.status(403).json({
        success: false,
        message: "Only users with completed bookings can review",
      });
      return;
    }

    // Prevent duplicate review for the same booking
    const existingReview = await getReviewsCollection().findOne({
      bookingId: new ObjectId(bookingId),
    });

    if (existingReview) {
      res.status(409).json({
        success: false,
        message: "You have already reviewed this booking",
      });
      return;
    }

    const newReview = {
      studioId: new ObjectId(studioId),
      userId,
      bookingId: new ObjectId(bookingId),
      rating: numericRating,
      comment: comment.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getReviewsCollection().insertOne(newReview);

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: {
        _id: result.insertedId,
        ...newReview,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create review",
    });
  }
};


export const getStudioReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studioId } = req.params;

    if (typeof studioId !== "string" || !ObjectId.isValid(studioId)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const reviews = await getReviewsCollection()
      .find({ studioId: new ObjectId(studioId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error("Get studio reviews error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};


export const updateReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    if (
      rating !== undefined &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
      return;
    }

    if (comment !== undefined && (
      typeof comment !== "string" || !comment.trim()
    )) {
      res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
      return;
    }

    if (rating === undefined && comment === undefined) {
      res.status(400).json({
        success: false,
        message: "Nothing to update",
      });
      return;
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment.trim();

    const result = await getReviewsCollection().updateOne(
      {
        _id: new ObjectId(id),
        userId,
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Review not found or you are not authorized",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Update review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update review",
    });
  }
};


export const deleteReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    const result = await getReviewsCollection().deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Review not found or you are not authorized",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};