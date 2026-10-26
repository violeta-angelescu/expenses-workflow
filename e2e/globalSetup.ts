import { createExpenseIndexes } from "../tests/expenseIndexes";
import { dropDatabase, withDatabase } from "./db";

export default async function globalSetup() {
  await withDatabase(createExpenseIndexes);
  return dropDatabase; // global teardown
}
