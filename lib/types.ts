export const EXPENSE_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

export function isExpenseStatus(value: string): value is ExpenseStatus {
  return EXPENSE_STATUSES.includes(value as ExpenseStatus);
}

export type ExpenseEvent = "submit" | "approve" | "reject";

export interface LineItem {
  description: string;
  amount: number;
}

export interface Expense {
  id: string;
  title: string;
  lineItems: LineItem[];
  total: number;
  status: ExpenseStatus;
  rejectionComment?: string;
  createdAt: string;
  updatedAt: string;
}
