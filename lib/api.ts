import type { Expense, ExpenseEvent, ExpensePage, ExpenseStatus, LineItem } from "./types";
import { ApiError } from "./errors";

const errorMessage = (data: unknown): string | undefined =>
  typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
    ? data.error
    : undefined;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init).catch((e) => {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Network error. Please try again.");
  });
  const data = await res.json().catch((e) => {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  });
  if (!res.ok) throw new ApiError(errorMessage(data) ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  list: (
    params: { status?: ExpenseStatus; q?: string; minTotal?: string; maxTotal?: string; cursor?: string } = {},
    signal?: AbortSignal,
  ) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    if (params.minTotal) qs.set("minTotal", params.minTotal);
    if (params.maxTotal) qs.set("maxTotal", params.maxTotal);
    if (params.cursor) qs.set("cursor", params.cursor);
    return request<ExpensePage>(`/api/expenses?${qs.toString()}`, { signal });
  },
  create: (title: string, lineItems: LineItem[]) =>
    request<Expense>("/api/expenses", post({ title, lineItems })),
  transition: (id: string, event: ExpenseEvent, comment?: string) =>
    request<Expense>(`/api/expenses/${encodeURIComponent(id)}/transition`, post({ event, comment })),
};
