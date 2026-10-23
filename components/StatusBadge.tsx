import type { ExpenseStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  return <span className={`badge ${status}`}>{status}</span>;
}
