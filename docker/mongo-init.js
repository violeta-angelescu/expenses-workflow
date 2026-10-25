const database = db.getSiblingDB("expense_approval");

// Matches the list query: filter by status, newest first.
database.expenses.createIndex({ status: 1, createdAt: -1 });
