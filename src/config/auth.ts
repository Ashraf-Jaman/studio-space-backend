import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getDB, getMongoClient } from "./db.js";

const createAuth = (secret: string, baseURL: string) => {
  return betterAuth({
    database: mongodbAdapter(getDB(), {
      client: getMongoClient(),
    }),
    secret,
    baseURL,
    trustedOrigins: ["http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
    },
  });
};

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | null = null;

export const initAuth = (): Auth => {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;

  if (!secret || !baseURL) {
    throw new Error("Better Auth environment variables are missing!");
  }

  auth = createAuth(secret, baseURL);

  return auth;
};

export const getAuth = (): Auth => {
  if (!auth) {
    throw new Error("Better Auth is not initialized!");
  }

  return auth;
};