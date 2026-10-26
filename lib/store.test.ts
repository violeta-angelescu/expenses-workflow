import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import { InvalidExpenseCursorError } from "./errors";
import type { Expense, ExpenseStatus } from "./types";

// Integration tests: they need MongoDB (MONGODB_URI, default 127.0.0.1, e.g. `docker compose up -d mongo`)
// and use a throwaway database that is dropped afterwards.

const PAGE_SIZE = 20; // mirrors PAGE_SIZE in store.ts
const BASE = Date.parse("2026-01-01T00:00:00.000Z");

type Filters = { status?: ExpenseStatus; query?: string };

let store: typeof import("./store").store;
let db: typeof import("./db");

before(async () => {
  process.env.MONGODB_DB = `expense_approval_test_${process.pid}`;

  // `server-only` throws outside of Next's bundler, so stub it while loading ./db.
  const internals = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
  const originalLoad = internals._load;
  internals._load = function (this: unknown, request, ...rest) {
    return request === "server-only" ? {} : originalLoad.call(this, request, ...rest);
  };
  try {
    db = await import("./db");
    ({ store } = await import("./store"));
  } finally {
    internals._load = originalLoad;
  }

  await db.database.command({ ping: 1 }); // fail fast if MongoDB is not running
});

beforeEach(() => db.database.collection("expenses").deleteMany({}));

after(async () => {
  await db.database.dropDatabase();
  await db.mongoClient.close();
});

let nextId = 0;

// Inserts `count` expenses with `perSecond` of them sharing each createdAt; `overrides(i)` tweaks any field.
async function seed(count: number, perSecond = 1, overrides: (i: number) => Partial<Expense> = () => ({})) {
  const expenses = Array.from({ length: count }, (_, i): Expense => {
    const createdAt = new Date(BASE + Math.floor(i / perSecond) * 1000).toISOString();
    const n = nextId++;
    return {
      id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      title: `Expense ${n}`,
      lineItems: [{ description: "Item", amount: 10 }],
      total: 10,
      status: "draft",
      createdAt,
      updatedAt: createdAt,
      ...overrides(i),
    };
  });
  await db.database.collection("expenses").insertMany(
    expenses.map(({ id, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      _id: id as never,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    })),
  );
  return expenses;
}

// Ids in the order the store should return them: newest first, ties broken by id.
const expectedIds = (expenses: Expense[]) =>
  [...expenses]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .map((e) => e.id);

async function collectAll(filters: Filters = {}) {
  const ids: string[] = [];
  const pageSizes: number[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list({ ...filters, cursor });
    ids.push(...page.items.map((item) => item.id));
    pageSizes.push(page.items.length);
    cursor = page.nextCursor;
    assert.ok(pageSizes.length < 50, "pagination did not terminate");
  } while (cursor);
  return { ids, pageSizes };
}

test("returns every expense exactly once, newest first, across pages", async () => {
  const expenses = await seed(53);
  const { ids, pageSizes } = await collectAll();
  assert.deepEqual(pageSizes, [PAGE_SIZE, PAGE_SIZE, 13]);
  assert.deepEqual(ids, expectedIds(expenses));
});

test("expenses sharing a timestamp are not skipped or repeated at page boundaries", async () => {
  const expenses = await seed(45, 45);
  const { ids } = await collectAll();
  assert.deepEqual(ids, expectedIds(expenses));
});

test("only returns a nextCursor when more than a page remains", async () => {
  await seed(PAGE_SIZE);
  const full = await store.list();
  assert.equal(full.items.length, PAGE_SIZE);
  assert.equal(full.nextCursor, undefined);

  await seed(1);
  const first = await store.list();
  assert.equal(first.items.length, PAGE_SIZE);
  assert.ok(first.nextCursor);

  const second = await store.list({ cursor: first.nextCursor });
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, undefined);
});

test("returns an empty page without a cursor when nothing matches", async () => {
  assert.deepEqual(await store.list(), { items: [] });
  await seed(3);
  assert.deepEqual(await store.list({ query: "no such expense" }), { items: [] });
});

test("a new expense created between page requests does not shift later pages", async () => {
  const expenses = await seed(30);
  const first = await store.list();
  await seed(1, 1, () => ({ createdAt: new Date(BASE + 1_000_000).toISOString() }));
  const second = await store.list({ cursor: first.nextCursor });

  assert.deepEqual([...first.items, ...second.items].map((e) => e.id), expectedIds(expenses));
});

test("keeps filters while paging and matches search text literally", async () => {
  const statuses: ExpenseStatus[] = ["draft", "submitted", "approved", "rejected"];
  const expenses = await seed(240, 2, (i) => ({
    status: statuses[i % 4],
    title: i % 2 === 0 ? `Trip a.b ${i}` : `Trip aXb ${i}`,
    lineItems: [{ description: i % 3 === 0 ? "Taxi (airport)" : "Snack", amount: 10 }],
  }));

  const cases: [string, Filters, (e: Expense) => boolean][] = [
    ["status", { status: "submitted" }, (e) => e.status === "submitted"],
    ["title, '.' is literal", { query: "a.b" }, (e) => e.title.includes("a.b")],
    ["description, parentheses are literal", { query: "(airport)" }, (e) => e.lineItems[0].description.includes("(airport)")],
    ["status and query", { status: "approved", query: "a.b" }, (e) => e.status === "approved" && e.title.includes("a.b")],
  ];
  for (const [name, filters, matches] of cases) {
    const { ids, pageSizes } = await collectAll(filters);
    assert.ok(pageSizes.length > 1, `${name}: expected several pages`);
    assert.deepEqual(ids, expectedIds(expenses.filter(matches)), name);
  }
});

test("rejects malformed cursors", async () => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const createdAt = new Date(BASE).toISOString();
  const cursors = {
    "not JSON": Buffer.from("not json").toString("base64url"),
    "JSON null": encode(null),
    "JSON number": encode(42),
    "missing id": encode({ createdAt }),
    "empty id": encode({ createdAt, id: "" }),
    "invalid date": encode({ createdAt: "garbage", id: "x" }),
  };
  for (const [name, cursor] of Object.entries(cursors)) {
    await assert.rejects(store.list({ cursor }), InvalidExpenseCursorError, name);
  }
});
