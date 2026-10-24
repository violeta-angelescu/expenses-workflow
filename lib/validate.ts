import type { LineItem } from "./types";

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_LINE_ITEMS = 50;
export const MAX_AMOUNT = 1_000_000;

const hasAtMostCents = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export function parseCreateBody(body: unknown): { title: string; lineItems: LineItem[] } | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const { title, lineItems } = body as { title?: unknown; lineItems?: unknown };
  if (typeof title !== "string" || !title.trim()) return "Title is required";
  if (title.trim().length > MAX_TITLE_LENGTH) return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
  if (!Array.isArray(lineItems) || lineItems.length === 0) return "At least one line item is required";
  if (lineItems.length > MAX_LINE_ITEMS) return `At most ${MAX_LINE_ITEMS} line items are allowed`;
  const items: LineItem[] = [];
  for (const li of lineItems) {
    const d = (li as LineItem)?.description;
    const a = (li as LineItem)?.amount;
    if (typeof d !== "string" || !d.trim()) return "Each line item needs a description";
    if (d.trim().length > MAX_DESCRIPTION_LENGTH) return `Descriptions must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
    if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) return "Each line item needs a positive amount";
    if (a > MAX_AMOUNT) return `Each amount must be at most ${MAX_AMOUNT}`;
    if (!hasAtMostCents(a) || Math.round(a * 100) < 1) return "Amounts cannot have more than 2 decimal places";
    items.push({ description: d.trim(), amount: a });
  }
  return { title: title.trim(), lineItems: items };
}
