"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Alert } from "@/components/Alert";
import { ExpenseCard } from "@/components/ExpenseCard";
import { RejectExpenseForm } from "@/components/RejectExpenseForm";
import { PageErrorAlert } from "@/components/PageErrorAlert";
import { SearchInput } from "@/components/SearchInput";
import { Spinner } from "@/components/Spinner";
import { getClientErrorMessage, reportClientError } from "@/lib/clientError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPriceInput, validatePriceFilter } from "@/lib/priceFilter";
import { PaginationControls } from "@/components/PaginationControls";

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
      <Button type="button" disabled={busy} onClick={onApprove}>
        {busy ? "Approving…" : "Approve"}
      </Button>
      <Button type="button" variant="destructive" disabled={busy} onClick={onReject}>
        Reject
      </Button>
    </span>
  );
}

type Action = { id: string; event: "approve" | "reject"; text?: string };

export default function ApprovalsPage() {
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const minTotal = minInput.trim();
  const maxTotal = maxInput.trim();
  // Ignore keystrokes and pastes that are not a valid price (e.g. "-", "e", letters).
  const onPriceChange = (set: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPriceInput(e.target.value)) return;
    set(e.target.value);
    setCursors([]);
  };
  const priceErrors = validatePriceFilter({ minTotal, maxTotal });
  const queryKey = [...submittedExpensesKey, query, minTotal, maxTotal] as const;

  const expensesQuery = useQuery({
    queryKey: [...queryKey, cursors.at(-1)],
    queryFn: ({ signal }) =>
      api.list({ status: "submitted", q: query, minTotal, maxTotal, cursor: cursors.at(-1) }, signal),
    placeholderData: keepPreviousData,
    enabled: !priceErrors,
  });

  const transition = useMutation({
    mutationFn: ({ id, event, text }: Action) => api.transition(id, event, text),
    onSuccess: async (_expense, { id }) => {
      await queryClient.invalidateQueries({ queryKey: submittedExpensesKey });
      // Only close the form of the card that was just handled.
      setRejectingId((current) => (current === id ? null : current));
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
      <div style={{ display: "flex", gap: ".5rem", marginBottom: ".75rem" }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            onSearch={(value) => {
              setQuery(value);
              setCursors([]);
            }}
            placeholder="Search by title or line item…"
          />
        </div>
        <Input
          inputMode="decimal"
          aria-label="Minimum price"
          aria-invalid={Boolean(priceErrors?.minTotal)}
          placeholder="Min price"
          value={minInput}
          onChange={onPriceChange(setMinInput)}
          style={{ width: "8rem", marginBottom: ".75rem" }}
        />
        <Input
          inputMode="decimal"
          aria-label="Maximum price"
          aria-invalid={Boolean(priceErrors?.maxTotal)}
          placeholder="Max price"
          value={maxInput}
          onChange={onPriceChange(setMaxInput)}
          style={{ width: "8rem", marginBottom: ".75rem" }}
        />
      </div>
      {priceErrors && <Alert title="Invalid price filter">{priceErrors.minTotal ?? priceErrors.maxTotal}</Alert>}
      {error && (
        <PageErrorAlert
          error={error}
          onDismiss={transition.error ? transition.reset : undefined}
          onRetry={() => void expensesQuery.refetch()}
        />
      )}
      {priceErrors ? null : expensesQuery.isPending ? (
        <Spinner />
      ) : expensesQuery.data?.items.length === 0 && !error ? (
        <div className="empty">
          {query ? `No submitted expenses match “${query}”.` : "Nothing waiting for approval."}
        </div>
      ) : (
        expensesQuery.data?.items.map((expense) => (
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
      {!priceErrors && (
        <PaginationControls
          hasPrevious={cursors.length > 0}
          hasNext={Boolean(expensesQuery.data?.nextCursor)}
          busy={expensesQuery.isFetching}
          onPrevious={() => setCursors((current) => current.slice(0, -1))}
          onNext={() => {
            if (expensesQuery.data?.nextCursor) {
              setCursors((current) => [...current, expensesQuery.data!.nextCursor!]);
            }
          }}
        />
      )}
    </>
  );
}
