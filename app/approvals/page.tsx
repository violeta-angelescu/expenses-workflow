"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { RejectExpenseForm } from "@/components/RejectExpenseForm";
import { PageErrorAlert, type PageError } from "@/components/PageErrorAlert";
import { SearchInput } from "@/components/SearchInput";
import { Spinner } from "@/components/Spinner";
import { getClientErrorMessage, reportClientError } from "@/lib/clientError";

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

export default function ApprovalsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (q: string) => {
    controller.current?.abort(); // drop stale in-flight searches
    const ctrl = (controller.current = new AbortController());
    setLoading(true);
    setError(null);
    try {
      const data = await api.list({ status: "submitted", q }, ctrl.signal);
      if (ctrl.signal.aborted || controller.current !== ctrl) return;
      setExpenses(data);
    } catch (e) {
      const message = getClientErrorMessage(e);
      if (message && !ctrl.signal.aborted && controller.current === ctrl) {
        setError({ title: "Unable to load approval queue", message, canRetry: true });
      }
    } finally {
      if (controller.current === ctrl) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
    return () => controller.current?.abort();
  }, [query, load]);

  async function act(id: string, event: "approve" | "reject", text?: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.transition(id, event, text);
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      setRejectingId(null);
    } catch (e) {
      const message = getClientErrorMessage(e);
      if (!message) return;
      setError({ title: "Unable to update expense", message, canRetry: false });
      // The expense may have been handled elsewhere; refresh so the queue isn't stale.
      try {
        setExpenses(await api.list({ status: "submitted", q: query }));
      } catch (refreshError) {
        // Keep the original error, but make the refresh failure visible to monitoring.
        reportClientError(refreshError, { surface: "app/approvals/refresh-after-action" });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>Approval Queue</h1>
      <SearchInput onSearch={setQuery} placeholder="Search by title or line item…" />
      {error && (
        <PageErrorAlert error={error} onDismiss={() => setError(null)} onRetry={() => load(query)} />
      )}
      {loading ? (
        <Spinner />
      ) : expenses.length === 0 && !error ? (
        <div className="empty">{query ? `No submitted expenses match “${query}”.` : "Nothing waiting for approval."}</div>
      ) : (
        expenses.map((x) => (
          <ExpenseCard key={x.id} expense={x}>
            {rejectingId === x.id ? (
              <RejectExpenseForm
                expenseId={x.id}
                busy={busyId === x.id}
                onConfirm={(text) => act(x.id, "reject", text)}
                onCancel={() => setRejectingId(null)}
              />
            ) : (
              <ApprovalActions
                busy={busyId === x.id}
                onApprove={() => act(x.id, "approve")}
                onReject={() => setRejectingId(x.id)}
              />
            )}
          </ExpenseCard>
        ))
      )}
    </>
  );
}
