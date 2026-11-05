import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getDB, getMongoClient } from "./db.js";

const createAuth = (secret: string, baseURL: string) => {
  return betterAuth({
    database: mongodbAdapter(getDB(), {
      client: getMongoClient(),
    }),

    user: {
      additionalFields: {
        role: {
          type: ["customer", "studio_owner", "admin"],
          required: false,
          defaultValue: "customer",
          input: true,
        },
      },
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              // Public signup can choose customer or studio_owner, never admin.
              role: user.role === "studio_owner" ? "studio_owner" : "customer",
            },
          }),
        },
      },
    },

    secret,
    baseURL,
    trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [jwt()],
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
