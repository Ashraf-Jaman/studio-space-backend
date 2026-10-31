import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  getBookingsCollection,
  getStudiosCollection,
} from "../config/db.js";


export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studioId,
      userId,
      startTime,
      endTime,
    } = req.body;

    // Validate required fields
    if (!studioId || !userId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    // Validate Studio ID
    if (!ObjectId.isValid(studioId)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validate booking time
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

    // Find Studio
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

    // Check overlapping bookings
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

    // Calculate total price
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



export const getMyBookings = async (
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



export const cancelBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
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

    const result = await getBookingsCollection().updateOne(
      {
        _id: new ObjectId(id),
        userId,
        status: booking.status,
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
        message: "Booking status changed. Please try again.",
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

