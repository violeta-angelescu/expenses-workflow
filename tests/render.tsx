import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Expense, ExpensePage } from "@/lib/types";

/** Renders a page with a fresh QueryClient (no retries, nothing cached between tests). */
export function renderPage(page: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { user: userEvent.setup(), ...render(<QueryClientProvider client={client}>{page}</QueryClientProvider>) };
}

export const button = (name: string) => screen.getByRole("button", { name });

export const expense =(overrides: Partial<Expense> = {}): Expense => ({
  id: "e1",
  title: "Conference travel",
  lineItems: [{ description: "Flight", amount: 420 }],
  total: 420,
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const page = (items: Expense[], nextCursor?: string): ExpensePage => ({
  items,
  ...(nextCursor ? { nextCursor } : {}),
});
