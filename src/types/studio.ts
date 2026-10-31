
import { ObjectId } from "mongodb";

export interface Studio {
  _id?: ObjectId;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  location: string;
  address: string;
  pricePerHour: number;
  capacity: number;
  images: string[];
  amenities: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
