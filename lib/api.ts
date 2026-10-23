import type { Expense, ExpenseEvent, LineItem } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Network error. Please try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  list: (params: { status?: string; q?: string } = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    return request<Expense[]>(`/api/expenses?${qs}`, { signal });
  },
  create: (title: string, lineItems: LineItem[]) =>
    request<Expense>("/api/expenses", post({ title, lineItems })),
  transition: (id: string, event: ExpenseEvent, comment?: string) =>
    request<Expense>(`/api/expenses/${id}/transition`, post({ event, comment })),
};

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
