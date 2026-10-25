import type { Expense, ExpenseEvent, ExpenseStatus } from "./types";

interface TransitionDef {
  to: ExpenseStatus;
  /** Returns an error message when the transition must be refused. */
  guard?: (expense: Expense, payload: TransitionPayload) => string | null;
  /** Returns fields to apply to the transitioned expense. */
  update?: (payload: TransitionPayload) => Partial<Expense>;
}

export interface TransitionPayload {
  comment?: string;
}

const machine: Record<ExpenseStatus, Partial<Record<ExpenseEvent, TransitionDef>>> = {
  draft: {
    submit: {
      to: "submitted",
      guard: (e) => (e.lineItems.length === 0 ? "Cannot submit an expense without line items" : null),
    },
  },
  submitted: {
    approve: { to: "approved" },
    reject: {
      to: "rejected",
      guard: (_, p) => (p.comment?.trim() ? null : "A comment is required to reject an expense"),
      update: (p) => ({ rejectionComment: p.comment!.trim() }),
    },
  },
  approved: {},
  rejected: {},
};

type TransitionResolution =
  | { ok: true; definition: TransitionDef }
  | { ok: false; kind: "invalid_transition" | "guard_failed"; message: string };

function resolveTransition(
  expense: Expense,
  event: ExpenseEvent,
  payload: TransitionPayload,
): TransitionResolution {
  const definition = machine[expense.status][event];
  if (!definition) {
    return {
      ok: false,
      kind: "invalid_transition",
      message: `Cannot ${event} an expense that is ${expense.status}`,
    };
  }

  const error = definition.guard?.(expense, payload);
  if (error) return { ok: false, kind: "guard_failed", message: error };

  return { ok: true, definition };
}

export class TransitionError extends Error {
  constructor(message: string, readonly kind: "invalid_transition" | "guard_failed") {
    super(message);
  }
}

export function canTransition(
  expense: Expense,
  event: ExpenseEvent,
  payload: TransitionPayload = {},
): boolean {
  return resolveTransition(expense, event, payload).ok;
}

/**
 * Validates and applies an event, returning a new expense with its next status
 * and updated timestamp, or throws TransitionError when the event is refused.
 */
export function transition(expense: Expense, event: ExpenseEvent, payload: TransitionPayload = {}): Expense {
  const result = resolveTransition(expense, event, payload);
  if (!result.ok) throw new TransitionError(result.message, result.kind);

  return {
    ...expense,
    ...result.definition.update?.(payload),
    status: result.definition.to,
    updatedAt: new Date().toISOString(),
  };
}
