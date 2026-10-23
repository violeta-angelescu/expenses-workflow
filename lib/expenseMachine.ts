import type { Expense, ExpenseEvent, ExpenseStatus } from "./types";

/**
 * Declarative state machine: every legal transition lives in this table.
 * Anything not listed is invalid, so callers never need ad-hoc status checks.
 */
interface TransitionDef {
  to: ExpenseStatus;
  /** Returns an error message when the transition must be refused. */
  guard?: (expense: Expense, payload: TransitionPayload) => string | null;
  /** Applies side effects of the transition to the (already copied) expense. */
  apply?: (expense: Expense, payload: TransitionPayload) => void;
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
      apply: (e, p) => {
        e.rejectionComment = p.comment!.trim();
      },
    },
  },
  approved: {},
  rejected: {},
};

export class TransitionError extends Error {
  constructor(message: string, readonly kind: "invalid_transition" | "guard_failed") {
    super(message);
  }
}

export function canTransition(status: ExpenseStatus, event: ExpenseEvent): boolean {
  return Boolean(machine[status][event]);
}

/** Pure: returns a new expense or throws TransitionError. */
export function transition(expense: Expense, event: ExpenseEvent, payload: TransitionPayload = {}): Expense {
  const def = machine[expense.status][event];
  if (!def) {
    throw new TransitionError(`Cannot ${event} an expense that is ${expense.status}`, "invalid_transition");
  }
  const error = def.guard?.(expense, payload);
  if (error) throw new TransitionError(error, "guard_failed");

  const next: Expense = { ...expense, status: def.to, updatedAt: new Date().toISOString() };
  def.apply?.(next, payload);
  return next;
}
