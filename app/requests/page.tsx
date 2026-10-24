"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canTransition } from "@/lib/expenseMachine";
import type { Expense } from "@/lib/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ExpenseForm, type ExpenseFormData } from "@/components/ExpenseForm";
import { PageErrorAlert, type PageError } from "@/components/PageErrorAlert";
import { Spinner } from "@/components/Spinner";
import { getClientErrorMessage } from "@/lib/clientError";

export default function RequestsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await api.list());
    } catch (e) {
      const message = getClientErrorMessage(e);
      if (!message) return;
      setError({ title: "Unable to load requests", message, canRetry: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create({ title, items }: ExpenseFormData) {
    setSaving(true);
    setError(null);
    try {
      const created = await api.create(
        title,
        items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
      );
      setExpenses((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      const message = getClientErrorMessage(err);
      if (!message) return false;
      setError({ title: "Unable to create expense", message, canRetry: false });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await api.transition(id, "submit");
      setExpenses((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      const message = getClientErrorMessage(err);
      if (!message) return;
      setError({ title: "Unable to submit expense", message, canRetry: false });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>My Requests</h1>
      {error && (
        <PageErrorAlert error={error} onDismiss={() => setError(null)} onRetry={load} />
      )}

      <ExpenseForm saving={saving} onCreate={create} />

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 && !error ? (
        <div className="empty">No expenses yet. Create your first request above.</div>
      ) : (
        expenses.map((x) => (
          <ExpenseCard key={x.id} expense={x}>
            {canTransition(x, "submit") && (
              <button disabled={busyId === x.id} onClick={() => submit(x.id)}>
                {busyId === x.id ? "Submitting…" : "Submit for approval"}
              </button>
            )}
          </ExpenseCard>
        ))
      )}
    </>
  );
}
