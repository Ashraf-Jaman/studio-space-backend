
import { MongoClient, Db } from "mongodb";

let client: MongoClient;
let database: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri || !dbName) {
      throw new Error("MongoDB environment variables are missing!");
    }

    client = new MongoClient(uri);

    await client.connect();

    database = client.db(dbName);

    await database.command({ ping: 1 });

    console.log("MongoDB Connected Successfully!");

    return database;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    throw error;
  }
};

export const getDB = (): Db => {
  if (!database) {
    throw new Error("Database is not connected!");
  }

  return database;
};
