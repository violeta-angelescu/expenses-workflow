import { money } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function ExpenseCard({ expense, children }: { expense: Expense; children?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="row">
        <strong>{expense.title}</strong>
        <StatusBadge status={expense.status} />
      </div>
      <ul className="items">
        {expense.lineItems.map((li, i) => (
          <li key={i}>
            {li.description} — {money(li.amount)}
          </li>
        ))}
      </ul>
      <div className="row">
        <span>Total: <strong>{money(expense.total)}</strong></span>
        {children}
      </div>
      {expense.rejectionComment && <p className="muted">Rejected: {expense.rejectionComment}</p>}
    </div>
  );
}
