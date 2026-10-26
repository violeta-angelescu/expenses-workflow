import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { database } from "./db";
import { InvalidExpenseCursorError } from "./errors";
import type { Expense, ExpensePage, ExpenseStatus, LineItem } from "./types";

type ExpenseDocument = Omit<Expense, "id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

type ExpenseCursor = { createdAt: string; id: string };

const PAGE_SIZE = 20;

const expenses = database.collection<ExpenseDocument>("expenses");

function toExpense({ _id: id, createdAt, updatedAt, ...expense }: ExpenseDocument): Expense {
  return {
    ...expense,
    id,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function toDocument(expense: Expense): ExpenseDocument {
  const { id, createdAt, updatedAt, ...fields } = expense;
  return {
    ...fields,
    _id: id,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
  };
}

function encodeCursor(cursor: ExpenseCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | undefined): ExpenseCursor | undefined {
  if (!value) return undefined;

  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ExpenseCursor> | null;
    const { createdAt, id } = cursor ?? {};

    if (
      typeof createdAt !== "string" ||
      Number.isNaN(Date.parse(createdAt)) ||
      typeof id !== "string" ||
      !id
    ) {
      throw new InvalidExpenseCursorError("Invalid pagination cursor");
    }

    return { createdAt, id };
  } catch {
    throw new InvalidExpenseCursorError("Invalid pagination cursor");
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const store = {
  async list(filters: { status?: ExpenseStatus; query?: string; cursor?: string } = {}): Promise<ExpensePage> {
    const conditions: Filter<ExpenseDocument>[] = [];
    if (filters.status) conditions.push({ status: filters.status });

    const query = filters.query?.trim();

    if (query) {
      const pattern = new RegExp(escapeRegex(query), "i");
      conditions.push({ $or: [{ title: pattern }, { "lineItems.description": pattern }] });
    }

    const cursor = decodeCursor(filters.cursor);
    if (cursor) {
      const createdAt = new Date(cursor.createdAt);
      conditions.push({
        $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: cursor.id } }],
      });
    }

    const filter: Filter<ExpenseDocument> = conditions.length ? { $and: conditions } : {};
    const documents = await expenses
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(PAGE_SIZE + 1)
      .toArray();
    const hasNextPage = documents.length > PAGE_SIZE;
    const page = documents.slice(0, PAGE_SIZE);
    const last = page.at(-1);

    return {
      items: page.map(toExpense),
      ...(hasNextPage && last
        ? { nextCursor: encodeCursor({ createdAt: last.createdAt.toISOString(), id: last._id }) }
        : {}),
    };
  },

  async get(id: string): Promise<Expense | undefined> {
    const document = await expenses.findOne({ _id: id });
    return document ? toExpense(document) : undefined;
  },

  async create(title: string, lineItems: LineItem[]): Promise<Expense> {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: randomUUID(),
      title,
      lineItems,
      total: Math.round(lineItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await expenses.insertOne(toDocument(expense));
    return expense;
  },

  async save(expense: Expense, expectedStatus: ExpenseStatus): Promise<boolean> {
    const result = await expenses.replaceOne(
      { _id: expense.id, status: expectedStatus },
      toDocument(expense),
    );
    return result.matchedCount === 1;
  },
};
