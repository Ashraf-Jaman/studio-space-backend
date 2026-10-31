
import { ObjectId } from "mongodb";

export interface Review {
  _id?: ObjectId;
  studioId: ObjectId;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
