
import { ObjectId } from "mongodb";

export interface Booking {
  _id?: ObjectId;
  studioId: ObjectId;
  userId: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "unpaid" | "paid" | "refunded";
  createdAt: Date;
  updatedAt: Date;
}
