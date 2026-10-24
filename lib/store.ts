import { randomUUID } from "node:crypto";
import type { Filter } from "mongodb";
import { database } from "./db";
import type { Expense, ExpenseStatus, LineItem } from "./types";

type ExpenseDocument = Omit<Expense, "id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const store = {
  async list(filters: { status?: ExpenseStatus; query?: string } = {}): Promise<Expense[]> {
    const filter: Filter<ExpenseDocument> = filters.status ? { status: filters.status } : {};
    const query = filters.query?.trim();

    if (query) {
      const pattern = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ title: pattern }, { "lineItems.description": pattern }];
    }

    const documents = await expenses.find(filter).sort({ createdAt: -1 }).toArray();
    return documents.map(toExpense);
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
