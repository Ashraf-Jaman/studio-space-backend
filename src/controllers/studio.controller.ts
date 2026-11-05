import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getStudiosCollection,
  getBookingsCollection,
  getReviewsCollection,
} from "../config/db.js";


export const getAllStudios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      search,
      category,
      location,
      minPrice,
      maxPrice,
      capacity,
      amenities,
      minRating,
      sortBy,
    } = req.query;

    const filter: Record<string, any> = {
      isAvailable: true,
    };

    // Search by studio name
    if (typeof search === "string" && search.trim()) {
      const safeSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.name = {
        $regex: safeSearch,
        $options: "i",
      };
    }

    // Multiple category filter
    if (typeof category === "string" && category.trim()) {
      const categories = category
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (categories.length > 0) {
        filter.category = {
          $in: categories.map(
            (item) => new RegExp(
              `^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            )
          ),
        };
      }
    }

    // Location filter
    if (typeof location === "string" && location.trim()) {
      filter.location = {
        $regex: location.trim().replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        $options: "i",
      };
    }

    // Price filter
    const priceFilter: { $gte?: number; $lte?: number } = {};

    if (minPrice !== undefined) {
      const min = Number(minPrice);

      if (!Number.isFinite(min) || min < 0) {
        res.status(400).json({
          success: false,
          message: "Invalid minimum price",
        });
        return;
      }

      priceFilter.$gte = min;
    }

    if (maxPrice !== undefined) {
      const max = Number(maxPrice);

      if (!Number.isFinite(max) || max < 0) {
        res.status(400).json({
          success: false,
          message: "Invalid maximum price",
        });
        return;
      }

      priceFilter.$lte = max;
    }

    if (
      priceFilter.$gte !== undefined &&
      priceFilter.$lte !== undefined &&
      priceFilter.$gte > priceFilter.$lte
    ) {
      res.status(400).json({
        success: false,
        message: "Minimum price cannot exceed maximum price",
      });
      return;
    }

    if (Object.keys(priceFilter).length > 0) {
      filter.pricePerHour = priceFilter;
    }

    // Capacity filter
    if (capacity !== undefined) {
      const capacityValue = Number(capacity);

      if (!Number.isInteger(capacityValue) || capacityValue <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid capacity",
        });
        return;
      }

      filter.capacity = { $gte: capacityValue };
    }

    // Amenities filter
    if (typeof amenities === "string" && amenities.trim()) {
      const selectedAmenities = amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (selectedAmenities.length > 0) {
        filter.amenities = {
          $all: selectedAmenities,
        };
      }
    }

    // Minimum rating validation
    let ratingValue: number | undefined;

    if (minRating !== undefined) {
      ratingValue = Number(minRating);

      if (
        !Number.isFinite(ratingValue) ||
        ratingValue < 0 ||
        ratingValue > 5
      ) {
        res.status(400).json({
          success: false,
          message: "Rating must be between 0 and 5",
        });
        return;
      }
    }

    // Sorting validation
    const allowedSorts = [
      "price-low",
      "price-high",
      "rating",
      "name",
      "newest",
    ];

    const selectedSort =
      typeof sortBy === "string" && allowedSorts.includes(sortBy)
        ? sortBy
        : "newest";

    // Fetch studios
    const studios = await getStudiosCollection()
      .find(filter)
      .toArray();

    // Fetch reviews for these studios
    const studioIds = studios.map((studio) => studio._id);

    const reviews = studioIds.length
      ? await getReviewsCollection()
          .find({ studioId: { $in: studioIds } })
          .toArray()
      : [];

    // Calculate average rating
    const ratingMap = new Map<string, { total: number; count: number }>();

    for (const review of reviews) {
      const id = review.studioId.toString();
      const current = ratingMap.get(id) ?? {
        total: 0,
        count: 0,
      };

      current.total += Number(review.rating);
      current.count += 1;

      ratingMap.set(id, current);
    }

    // Attach average rating to every studio
    let result = studios.map((studio) => {
      const ratingData = ratingMap.get(studio._id.toString());

      const averageRating = ratingData
        ? Number((ratingData.total / ratingData.count).toFixed(1))
        : 0;

      return {
        ...studio,
        rating: averageRating,
        totalReviews: ratingData?.count ?? 0,
      };
    });

    // Filter by minimum rating
    if (ratingValue !== undefined) {
      result = result.filter(
        (studio) => studio.rating >= ratingValue!
      );
    }

    // Sort results
    switch (selectedSort) {
      case "price-low":
        result.sort((a, b) => a.pricePerHour - b.pricePerHour);
        break;

      case "price-high":
        result.sort((a, b) => b.pricePerHour - a.pricePerHour);
        break;

      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;

      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case "newest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );
        break;
    }

    res.status(200).json({
      success: true,
      message: "Studios fetched successfully",
      total: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Get studios error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studios",
    });
  }
};


export const createStudio = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      category,
      location,
      address,
      pricePerHour,
      capacity,
      images,
      amenities,
    } = req.body;

    if (
      !name ||
      !description ||
      !category ||
      !location ||
      !address ||
      pricePerHour == null ||
      capacity == null
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    if (
      !Number.isFinite(Number(pricePerHour)) ||
      Number(pricePerHour) < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid price",
      });
      return;
    }

    if (
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid capacity",
      });
      return;
    }

    const newStudio = {
      ownerId: req.user!.id,
      name,
      description,
      category,
      location,
      address,
      pricePerHour: Number(pricePerHour),
      capacity: Number(capacity),
      images: images ?? [],
      amenities: amenities ?? [],
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await getStudiosCollection().insertOne(newStudio);

    res.status(201).json({
      success: true,
      message: "Studio created successfully",
      data: {
        _id: result.insertedId,
        ...newStudio,
      },
    });
  } catch (error) {
    console.error("Create studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create studio",
    });
  }
};

export const getStudioById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const studio = await getStudiosCollection().findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      res.status(404).json({
        success: false,
        message: "Studio not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Studio fetched successfully",
      data: studio,
    });
  } catch (error) {
    console.error("Get studio by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch studio",
    });
  }
};

export const updateStudio = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const {
      ownerId,
      _id,
      createdAt,
      ...updateData
    } = req.body;

    
    if (
      Object.keys(updateData).length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide data to update",
      });
      return;
    }

    if (
      updateData.pricePerHour !== undefined &&
      (!Number.isFinite(Number(updateData.pricePerHour)) ||
        Number(updateData.pricePerHour) < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid price",
      });
      return;
    }

    if (
      updateData.capacity !== undefined &&
      (!Number.isInteger(Number(updateData.capacity)) ||
        Number(updateData.capacity) <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid capacity",
      });
      return;
    }

    if (updateData.pricePerHour !== undefined) {
      updateData.pricePerHour = Number(updateData.pricePerHour);
    }

    if (updateData.capacity !== undefined) {
      updateData.capacity = Number(updateData.capacity);
    }

    
    const result = await getStudiosCollection().updateOne(
      {
        _id: new ObjectId(id),
        ownerId: req.user!.id,
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      const studio = await getStudiosCollection().findOne({
        _id: new ObjectId(id),
      });

      if (!studio) {
        res.status(404).json({
          success: false,
          message: "Studio not found",
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: "You are not authorized to update this studio",
      });
      return;
    }

    const updatedStudio = await getStudiosCollection().findOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Studio updated successfully",
      data: updatedStudio,
    });
  } catch (error) {
    console.error("Update studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update studio",
    });
  }
};

export const deleteStudio = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
      return;
    }

    const result = await getStudiosCollection().deleteOne({
      _id: new ObjectId(id),
      ownerId: req.user!.id,
    });

    if (result.deletedCount === 0) {
      const studio = await getStudiosCollection().findOne({
        _id: new ObjectId(id),
      });

      if (!studio) {
        res.status(404).json({
          success: false,
          message: "Studio not found",
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this studio",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Studio deleted successfully",
    });
  } catch (error) {
    console.error("Delete studio error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete studio",
    });
  }
};


export const getOwnerDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = req.user!.id;

    
    const studios = await getStudiosCollection()
      .find({ ownerId })
      .toArray();

    const studioIds = studios.map((studio) => studio._id);

    
    const bookingStats = await getBookingsCollection()
      .aggregate([
        {
          $match: {
            studioId: { $in: studioIds },
          },
        },
        {
          $group: {
            _id: null,

            totalBookings: { $sum: 1 },

            pendingBookings: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
              },
            },

            confirmedBookings: {
              $sum: {
                $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
              },
            },

            completedBookings: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },

            cancelledBookings: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },

            totalEarnings: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "paid"] },
                  "$totalPrice",
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const stats = bookingStats[0] ?? {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalEarnings: 0,
    };

    res.status(200).json({
      success: true,
      message: "Owner dashboard fetched successfully",
      data: {
        totalStudios: studios.length,
        ...stats,
      },
    });
  } catch (error) {
    console.error("Owner dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch owner dashboard",
    });
  }
};
