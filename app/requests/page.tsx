"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canTransition } from "@/lib/expenseMachine";
import type { Expense } from "@/lib/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { ExpenseForm, type ExpenseFormData } from "@/components/ExpenseForm";
import { Alert } from "@/components/Alert";
import { Spinner } from "@/components/Spinner";

export default function RequestsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [canRetryLoad, setCanRetryLoad] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCanRetryLoad(false);
    try {
      setExpenses(await api.list());
    } catch (e) {
      setErrorTitle("Unable to load requests");
      setError((e as Error).message);
      setCanRetryLoad(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create({ title, items }: ExpenseFormData) {
    setSaving(true);
    setError(null);
    setCanRetryLoad(false);
    try {
      const created = await api.create(
        title,
        items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
      );
      setExpenses((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setErrorTitle("Unable to create expense");
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(id: string) {
    setBusyId(id);
    setError(null);
    setCanRetryLoad(false);
    try {
      const updated = await api.transition(id, "submit");
      setExpenses((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      setErrorTitle("Unable to submit expense");
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>My Requests</h1>
      {error && (
        <Alert title={errorTitle} onDismiss={() => setError(null)}>
          <span>{error}</span>
          {canRetryLoad && <button className="secondary" onClick={load}>Retry</button>}
        </Alert>
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
