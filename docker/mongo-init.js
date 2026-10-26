const database = db.getSiblingDB("expense_approval");

// Supports unfiltered and status-filtered cursor pagination (price filters are applied on top of these), plus text search.
database.expenses.createIndex({ createdAt: -1, _id: -1 });
database.expenses.createIndex({ status: 1, createdAt: -1, _id: -1 });
database.expenses.createIndex({ title: "text", "lineItems.description": "text" });
