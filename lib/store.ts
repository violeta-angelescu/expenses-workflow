import { randomUUID } from "node:crypto";
import type { Expense, LineItem } from "./types";

const now = () => new Date().toISOString();
const sum = (items: LineItem[]) => Math.round(items.reduce((t, i) => t + i.amount, 0) * 100) / 100;

function seed(): Map<string, Expense> {
  const mk = (title: string, lineItems: LineItem[], status: Expense["status"]): Expense => ({
    id: randomUUID(), title, lineItems, total: sum(lineItems), status, createdAt: now(), updatedAt: now(),
  });
  const list = [
    mk("Conference travel", [{ description: "Flight", amount: 420 }, { description: "Hotel", amount: 310.5 }], "submitted"),
    mk("Team lunch", [{ description: "Restaurant", amount: 96.2 }], "draft"),
  ];
  return new Map(list.map((e) => [e.id, e]));
}

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __expenses?: Map<string, Expense> };
const expenses = (g.__expenses ??= seed());

export const store = {
  list(): Expense[] {
    return [...expenses.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  get: (id: string) => expenses.get(id),
  create(title: string, lineItems: LineItem[]): Expense {
    const e: Expense = {
      id: randomUUID(), title, lineItems, total: sum(lineItems),
      status: "draft", createdAt: now(), updatedAt: now(),
    };
    expenses.set(e.id, e);
    return e;
  },
  save(e: Expense) {
    expenses.set(e.id, e);
  },
};
