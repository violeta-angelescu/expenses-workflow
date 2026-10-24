"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ExpenseCard } from "@/components/ExpenseCard";
import { RejectExpenseForm } from "@/components/RejectExpenseForm";
import { PageErrorAlert } from "@/components/PageErrorAlert";
import { SearchInput } from "@/components/SearchInput";
import { Spinner } from "@/components/Spinner";
import { getClientErrorMessage, reportClientError } from "@/lib/clientError";

const submittedExpensesKey = ["expenses", "submitted"] as const;

function ApprovalActions({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <span className="form-row" style={{ margin: 0 }}>
      <button type="button" disabled={busy} onClick={onApprove}>
        {busy ? "Approving…" : "Approve"}
      </button>
      <button type="button" className="danger" disabled={busy} onClick={onReject}>
        Reject
      </button>
    </span>
  );
}

type Action = { id: string; event: "approve" | "reject"; text?: string };

export default function ApprovalsPage() {
  const [query, setQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const queryKey = [...submittedExpensesKey, query] as const;

  const expensesQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.list({ status: "submitted", q: query }, signal),
  });

  const transition = useMutation({
    mutationFn: ({ id, event, text }: Action) => api.transition(id, event, text),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: submittedExpensesKey });
      setRejectingId(null);
    },
    onError: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: submittedExpensesKey });
      } catch (refreshError) {
        reportClientError(refreshError, { surface: "app/approvals/refresh-after-action" });
      }
    },
  });

  // Apply an approval decision, update the queue, and recover from stale data.
  function act(id: string, event: "approve" | "reject", text?: string) {
    transition.mutate({ id, event, text });
  }

  const error = transition.error
    ? {
        title: "Unable to update expense",
        message: getClientErrorMessage(transition.error) ?? "Unable to update expense",
        canRetry: false,
      }
    : expensesQuery.error
      ? {
          title: "Unable to load approval queue",
          message: getClientErrorMessage(expensesQuery.error) ?? "Unable to load approval queue",
          canRetry: true,
        }
      : null;

  return (
    <>
      <h1>Approval Queue</h1>
      <SearchInput onSearch={setQuery} placeholder="Search by title or line item…" />
      {error && (
        <PageErrorAlert
          error={error}
          onDismiss={transition.error ? transition.reset : undefined}
          onRetry={() => void expensesQuery.refetch()}
        />
      )}
      {expensesQuery.isPending ? (
        <Spinner />
      ) : expensesQuery.data?.length === 0 && !error ? (
        <div className="empty">
          {query ? `No submitted expenses match “${query}”.` : "Nothing waiting for approval."}
        </div>
      ) : (
        expensesQuery.data?.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense}>
            {rejectingId === expense.id ? (
              <RejectExpenseForm
                expenseId={expense.id}
                busy={transition.isPending && transition.variables?.id === expense.id}
                onConfirm={(text) => act(expense.id, "reject", text)}
                onCancel={() => setRejectingId(null)}
              />
            ) : (
              <ApprovalActions
                busy={transition.isPending && transition.variables?.id === expense.id}
                onApprove={() => act(expense.id, "approve")}
                onReject={() => setRejectingId(expense.id)}
              />
            )}
          </ExpenseCard>
        ))
      )}
    </>
  );
}
