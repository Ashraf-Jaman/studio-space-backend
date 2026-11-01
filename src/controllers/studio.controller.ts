import type { Request, Response } from "express";
import { getStudiosCollection } from "../config/db.js";
import { ObjectId } from "mongodb";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

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

    // Owner ID পরিবর্তন করতে দেওয়া হবে না
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

    // শুধু নিজের Studio update করতে পারবে
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
