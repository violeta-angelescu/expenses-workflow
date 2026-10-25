// Sample data for local development only.
const database = db.getSiblingDB("expense_approval");
const now = new Date();

database.expenses.updateOne(
  { _id: "00000000-0000-4000-8000-000000000001" },
  {
    $set: {
      title: "Conference travel",
      lineItems: [
        { description: "Flight", amount: 420 },
        { description: "Hotel", amount: 310.5 },
      ],
      total: 730.5,
      status: "submitted",
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);

database.expenses.updateOne(
  { _id: "00000000-0000-4000-8000-000000000002" },
  {
    $set: {
      title: "Team lunch",
      lineItems: [{ description: "Restaurant", amount: 96.2 }],
      total: 96.2,
      status: "draft",
      updatedAt: now,
    },
    $setOnInsert: { createdAt: now },
  },
  { upsert: true },
);
