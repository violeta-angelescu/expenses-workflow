import { MongoClient } from "mongodb";

export const E2E_DB = "expense_approval_e2e";

export async function withDatabase(action: (database: ReturnType<MongoClient["db"]>) => Promise<unknown>) {
  const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017");
  try {
    await action(client.db(E2E_DB));
  } finally {
    await client.close();
  }
}

export const resetExpenses = () => withDatabase((database) => database.collection("expenses").deleteMany({}));
export const dropDatabase = () => withDatabase((database) => database.dropDatabase());
