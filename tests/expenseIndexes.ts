import type { Db } from "mongodb";

// Test databases are not set up by docker compose, so they get the indexes by running the real migration.
const migration = "../db/migrations/20260201000000-expense-indexes.js";

export async function createExpenseIndexes(database: Db) {
  const { up } = require(migration) as { up: (db: Db) => Promise<void> };
  await up(database);
}
