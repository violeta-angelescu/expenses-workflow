"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { canTransition } from "@/lib/expenseMachine";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ExpenseForm, type ExpenseFormData } from "@/components/ExpenseForm";
import { PageErrorAlert } from "@/components/PageErrorAlert";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/PaginationControls";
import { getClientErrorMessage } from "@/lib/clientError";

const expensesKey = ["expenses"] as const;

export default function RequestsPage() {
  const [cursors, setCursors] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const cursor = cursors.at(-1);

  const expensesQuery = useQuery({
    queryKey: [...expensesKey, cursor],
    queryFn: ({ signal }) => api.list({ cursor }, signal),
    placeholderData: keepPreviousData,
  });

  const create = useMutation({
    mutationFn: ({ title, items }: ExpenseFormData) =>
      api.create(
        title,
        items.map((item) => ({ description: item.description, amount: Number(item.amount) })),
      ),
    onSuccess: async () => {
      // New expenses sort first, so go back to page one where the new one shows up.
      setCursors([]);
      await queryClient.invalidateQueries({ queryKey: expensesKey });
    },
  });

  const submit = useMutation({
    mutationFn: (id: string) => api.transition(id, "submit"),
    // Also refresh on failure so a stale card (e.g. 409) shows its real state.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: expensesKey });
    },
  });

  async function createExpense(data: ExpenseFormData) {
    try {
      await create.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }

  function submitExpense(id: string) {
    submit.mutate(id);
  }

  const error = (() => {
    if (create.error) {
      return {
        title: "Unable to create expense",
        message: getClientErrorMessage(create.error) ?? "Unable to create expense",
        canRetry: false,
      };
    }

    if (submit.error) {
      return {
        title: "Unable to submit expense",
        message: getClientErrorMessage(submit.error) ?? "Unable to submit expense",
        canRetry: false,
      };
    }

    if (expensesQuery.error) {
      return {
        title: "Unable to load requests",
        message: getClientErrorMessage(expensesQuery.error) ?? "Unable to load requests",
        canRetry: true,
      };
    }

    return null;
  })();

  return (
    <>
      <h1>My Requests</h1>
      {error && (
        <PageErrorAlert
          error={error}
          onDismiss={create.error ? create.reset : submit.error ? submit.reset : undefined}
          onRetry={() => void expensesQuery.refetch()}
        />
      )}

      <ExpenseForm saving={create.isPending} onCreate={createExpense} />

      {expensesQuery.isPending ? (
        <Spinner />
      ) : expensesQuery.data?.items.length === 0 && !error ? (
        <div className="empty">No expenses yet. Create your first request above.</div>
      ) : (
        expensesQuery.data?.items.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense}>
            {canTransition(expense, "submit") && (
              <Button
                disabled={submit.isPending}
                onClick={() => submitExpense(expense.id)}
              >
                {submit.isPending && submit.variables === expense.id
                  ? "Submitting…"
                  : "Submit for approval"}
              </Button>
            )}
          </ExpenseCard>
        ))
      )}
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
    </>
  );
}
