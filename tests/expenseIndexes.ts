import type { Db } from "mongodb";

// Test databases are not created by docker/mongo-init.js, so they get the indexes `$text` search needs here.
export const createExpenseIndexes = (database: Db) =>
  database.collection("expenses").createIndexes([
    { key: { createdAt: -1, _id: -1 } },
    { key: { status: 1, createdAt: -1, _id: -1 } },
    { key: { title: "text", "lineItems.description": "text" } },
  ]);
