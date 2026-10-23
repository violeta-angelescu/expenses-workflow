export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected";
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
