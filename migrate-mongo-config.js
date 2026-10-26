// Config for `migrate-mongo` (see the db:migrate* scripts in package.json).
module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
    databaseName: process.env.MONGODB_DB ?? "expense_approval",
  },
  migrationsDir: "db/migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};
