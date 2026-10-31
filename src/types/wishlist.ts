import { ObjectId } from "mongodb";

export interface Wishlist {
  _id?: ObjectId;
  userId: string;
  studioId: ObjectId;
  createdAt: Date;
}