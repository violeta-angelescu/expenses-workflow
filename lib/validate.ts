import type { LineItem } from "./types";

export function parseCreateBody(body: unknown): { title: string; lineItems: LineItem[] } | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const { title, lineItems } = body as { title?: unknown; lineItems?: unknown };
  if (typeof title !== "string" || !title.trim()) return "Title is required";
  if (!Array.isArray(lineItems) || lineItems.length === 0) return "At least one line item is required";
  const items: LineItem[] = [];
  for (const li of lineItems) {
    const d = (li as LineItem)?.description;
    const a = (li as LineItem)?.amount;
    if (typeof d !== "string" || !d.trim()) return "Each line item needs a description";
    if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) return "Each line item needs a positive amount";
    items.push({ description: d.trim(), amount: a });
  }
  return { title: title.trim(), lineItems: items };
}
