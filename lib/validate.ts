import * as z from "zod";
import { EXPENSE_EVENTS } from "./types";

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_LINE_ITEMS = 10;
export const MAX_AMOUNT = 100_000;

const hasAtMostCents = (amount: number) => Number(amount.toFixed(2)) === amount;

const lineItemSchema = z.object({
  description: z.string()
    .trim()
    .min(1, "Each line item needs a description")
    .max(MAX_DESCRIPTION_LENGTH, `Descriptions must be at most ${MAX_DESCRIPTION_LENGTH} characters`),
  amount: z.number()
    .positive("Each line item needs a positive amount")
    .max(MAX_AMOUNT, `Each amount must be at most ${MAX_AMOUNT}`)
    .refine(hasAtMostCents, "Amounts cannot have more than 2 decimal places"),
});

const createExpenseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`),
  lineItems: z.array(lineItemSchema)
    .min(1, "At least one line item is required")
    .max(MAX_LINE_ITEMS, `At most ${MAX_LINE_ITEMS} line items are allowed`),
});

const transitionExpenseSchema = z.object({
  event: z.enum(EXPENSE_EVENTS, { error: "Unknown event" }),
  comment: z.string({ error: "Comment must be a string" }).nullable().optional(),
});

export type CreateExpenseBody = z.infer<typeof createExpenseSchema>;
export type TransitionExpenseBody = z.infer<typeof transitionExpenseSchema>;

export function parseCreateBody(body: unknown): CreateExpenseBody | string {
  const result = createExpenseSchema.safeParse(body);
  if (!result.success) return result.error.issues[0]?.message ?? "Invalid body";
  return result.data;
}

export function parseTransitionBody(body: unknown): TransitionExpenseBody | string {
  const result = transitionExpenseSchema.safeParse(body);
  if (!result.success) return result.error.issues[0]?.message ?? "Invalid body";
  return result.data;
}
