// Brings an existing database's `expenses` indexes up to date. Safe to re-run. Run it BEFORE deploying code that
// uses `$text` search, which throws without the text index. Fresh volumes get the same indexes from docker/mongo-init.js.
//
//   mongosh "mongodb://127.0.0.1:27017/expense_approval" --file scripts/migrate-indexes.js
//   docker compose exec -T mongo mongosh expense_approval < scripts/migrate-indexes.js
const expenses = db.getCollection("expenses");

expenses.createIndex({ createdAt: -1, _id: -1 });
expenses.createIndex({ status: 1, createdAt: -1, _id: -1 });
expenses.createIndex({ title: "text", "lineItems.description": "text" });

// Superseded: price filters run on top of the pagination indexes.
if (expenses.getIndexes().some((index) => index.name === "total_1")) expenses.dropIndex("total_1");

const names = expenses.getIndexes().map((index) => index.name);
print(`${db.getName()}.expenses indexes: ${names.join(", ")}`);

if (!names.includes("title_text_lineItems.description_text")) {
  throw new Error("text index is missing");
}
