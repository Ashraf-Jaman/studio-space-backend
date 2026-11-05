
import type { Request,Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { ObjectId } from "mongodb";

import {
  getBookingsCollection,
  getStudiosCollection,
} from "../config/db.js";


// CREATE BOOKING
export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { studioId, startTime, endTime } = req.body;

    if (!studioId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    if (!ObjectId.isValid(studioId)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start ||
      start <= new Date()
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid booking date or time",
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

    if (!studio.isAvailable) {
      res.status(400).json({
        success: false,
        message: "Studio is not available",
      });
      return;
    }

    const existingBooking = await getBookingsCollection().findOne({
      studioId: new ObjectId(studioId),
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (existingBooking) {
      res.status(409).json({
        success: false,
        message: "Studio is already booked for this time",
      });
      return;
    }

    const durationInHours =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const totalPrice = durationInHours * studio.pricePerHour;

    const newBooking = {
      studioId: new ObjectId(studioId),
      userId,
      startTime: start,
      endTime: end,
      totalPrice,
      status: "pending" as const,
      paymentStatus: "unpaid" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getBookingsCollection().insertOne(newBooking);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        _id: result.insertedId,
        ...newBooking,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

// GET MY BOOKINGS
export const getMyBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const bookings = await getBookingsCollection()
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
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

// CANCEL BOOKING
export const cancelBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
      return;
    }

    const booking = await getBookingsCollection().findOne({
      _id: new ObjectId(id),
      userId,
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    if (booking.status === "cancelled") {
      res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
      return;
    }

    if (booking.status === "completed") {
      res.status(400).json({
        success: false,
        message: "Completed booking cannot be cancelled",
      });
      return;
    }

    if (booking.status === "confirmed") {
      res.status(400).json({
        success: false,
        message: "Confirmed bookings cannot be cancelled by the customer",
      });
      return;
    }

    const result = await getBookingsCollection().updateOne(
      {
        _id: new ObjectId(id),
        userId,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      res.status(409).json({
        success: false,
        message: "Only pending bookings can be cancelled",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};


// COMPLETE BOOKING (STUDIO OWNER ONLY)
export const completeBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Validate booking ID
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
      return;
    }

    // Find booking
    const booking = await getBookingsCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    // Find studio
    const studio = await getStudiosCollection().findOne({
      _id: booking.studioId,
    });

    if (!studio) {
      res.status(404).json({
        success: false,
        message: "Studio not found",
      });
      return;
    }

    // Check studio ownership
    if (studio.ownerId !== userId) {
      res.status(403).json({
        success: false,
        message: "Only the studio owner can complete this booking",
      });
      return;
    }

    // Only confirmed bookings can be completed
    if (booking.status !== "confirmed") {
      res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be completed",
      });
      return;
    }

    // Update booking status
    const result = await getBookingsCollection().updateOne(
      {
        _id: new ObjectId(id),
        status: "confirmed",
      },
      {
        $set: {
          status: "completed",
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      res.status(409).json({
        success: false,
        message: "Booking status changed. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Booking completed successfully",
    });
  } catch (error) {
    console.error("Complete booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to complete booking",
    });
  }
};

// CONFIRM BOOKING (STUDIO OWNER ONLY)
export const confirmBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Validate booking ID
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
      return;
    }

    // Find booking
    const booking = await getBookingsCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    // Find studio
    const studio = await getStudiosCollection().findOne({
      _id: booking.studioId,
    });

    if (!studio) {
      res.status(404).json({
        success: false,
        message: "Studio not found",
      });
      return;
    }

    // Check studio owner
    if (studio.ownerId !== userId) {
      res.status(403).json({
        success: false,
        message: "Only the studio owner can confirm this booking",
      });
      return;
    }

    // Only pending bookings can be confirmed
    if (booking.status !== "pending") {
      res.status(400).json({
        success: false,
        message: "Only pending bookings can be confirmed",
      });
      return;
    }

    // Update booking
    const result = await getBookingsCollection().updateOne(
      {
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "confirmed",
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      res.status(409).json({
        success: false,
        message: "Booking status changed. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
    });
  } catch (error) {
    console.error("Confirm booking error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to confirm booking",
    });
  }
};


export const getOwnerRecentBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = req.user!.id;

    
    const studios = await getStudiosCollection()
      .find({ ownerId })
      .toArray();

    const studioIds = studios.map((studio) => studio._id);

    
    const bookings = await getBookingsCollection()
      .aggregate([
        {
          $match: {
            studioId: { $in: studioIds },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $limit: 10,
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
          $unwind: "$studio",
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            studioId: 1,
            startTime: 1,
            endTime: 1,
            totalPrice: 1,
            status: 1,
            paymentStatus: 1,
            createdAt: 1,
            "studio.name": 1,
            "studio.location": 1,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      message: "Recent bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Owner recent bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recent bookings",
    });
  }
};


export const checkStudioAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studioId, startTime, endTime } = req.query;

    // Required fields validation
    if (
      typeof studioId !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "studioId, startTime and endTime are required",
      });
      return;
    }

    // Studio ID validation
    if (!ObjectId.isValid(studioId)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start <= new Date() ||
      end <= start
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid booking time",
      });
      return;
    }

    // Check studio
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

    if (!studio.isAvailable) {
      res.status(200).json({
        success: true,
        available: false,
        message: "Studio is currently unavailable",
      });
      return;
    }

    // Check overlapping bookings
    const existingBooking = await getBookingsCollection().findOne({
      studioId: new ObjectId(studioId),
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    const available = !existingBooking;

    res.status(200).json({
      success: true,
      available,
      message: available
        ? "Studio is available for the selected time"
        : "Studio is already booked for the selected time",
    });
  } catch (error) {
    console.error("Studio availability error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check studio availability",
    });
  }
};
