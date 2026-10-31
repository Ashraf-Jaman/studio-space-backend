
import { MongoClient, Db, Collection } from "mongodb";
import type { Studio } from "../types/studio.js";
import type { Booking } from "../types/booking.js";
import type { Review } from "../types/review.js";

let client: MongoClient;
let database: Db;

export const connectDB = async (): Promise<Db> => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;

  if (!uri || !dbName) {
    throw new Error("MongoDB environment variables are missing!");
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db(dbName);
  await database.command({ ping: 1 });

  // Create collections if they do not exist
  const existingCollections = await database
    .listCollections()
    .toArray();

  const collectionNames = existingCollections.map(
    (collection) => collection.name
  );

  const requiredCollections = [
    "studios",
    "bookings",
    "reviews",
    "wishlists",
    "categories",
  ];

  for (const name of requiredCollections) {
    if (!collectionNames.includes(name)) {
      await database.createCollection(name);
    }
  }

  console.log("MongoDB Connected Successfully!");
  console.log("Database Collections Ready!");

  return database;
};

export const getDB = (): Db => {
  if (!database) {
    throw new Error("Database is not connected!");
  }

  return database;
};

export const getStudiosCollection = (): Collection<Studio> =>
  getDB().collection<Studio>("studios");

export const getBookingsCollection = (): Collection<Booking> =>
  getDB().collection<Booking>("bookings");

export const getReviewsCollection = (): Collection<Review> =>
  getDB().collection<Review>("reviews");
