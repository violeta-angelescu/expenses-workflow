import "server-only";

import { MongoClient } from "mongodb";

type GlobalWithMongo = typeof globalThis & { __expenseMongoClient?: MongoClient };
const globalWithMongo = globalThis as GlobalWithMongo;

export const mongoClient =
  globalWithMongo.__expenseMongoClient ??
  new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017");
export const database = mongoClient.db(process.env.MONGODB_DB ?? "expense_approval");

if (process.env.NODE_ENV !== "production") {
  globalWithMongo.__expenseMongoClient = mongoClient;
}
