import { ObjectId } from "mongodb";

export interface Review {
  _id?: ObjectId;
  studioId: ObjectId;
  userId: string;
  bookingId: ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

