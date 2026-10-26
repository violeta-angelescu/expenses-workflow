// Pagination indexes plus the text index that `$text` search in lib/store.ts needs (it fails without it).
module.exports = {
  async up(db) {
    const expenses = db.collection("expenses");
    await expenses.createIndexes([
      { key: { createdAt: -1, _id: -1 } },
      { key: { status: 1, createdAt: -1, _id: -1 } },
      { key: { title: "text", "lineItems.description": "text" } },
    ]);
    // Superseded: price filters run on top of the pagination indexes.
    if (await expenses.indexExists("total_1")) await expenses.dropIndex("total_1");
  },

  async down(db) {
    const expenses = db.collection("expenses");
    for (const name of ["createdAt_-1__id_-1", "status_1_createdAt_-1__id_-1", "title_text_lineItems.description_text"]) {
      if (await expenses.indexExists(name)) await expenses.dropIndex(name);
    }
  },
};
