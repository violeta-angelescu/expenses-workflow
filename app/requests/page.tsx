"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { canTransition } from "@/lib/expenseMachine";
import type { Expense } from "@/lib/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { Spinner } from "@/components/Spinner";

export default function RequestsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [items, setItems] = useState([{ description: "", amount: "" }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExpenses(await api.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.create(
        title,
        items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
      );
      setExpenses((prev) => [created, ...prev]);
      setTitle("");
      setItems([{ description: "", amount: "" }]);
    } catch (err) {
      setError((err as Error).message);
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
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>My Requests</h1>
      {error && <div className="error" role="alert">{error}</div>}

      <form className="card" onSubmit={create}>
        <h2 style={{ marginTop: 0 }}>New expense</h2>
        <div className="form-row">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        {items.map((it, i) => (
          <div className="form-row" key={i}>
            <input
              placeholder="Description"
              value={it.description}
              required
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
            />
            <input
              type="number" min="0.01" step="0.01" placeholder="Amount" style={{ width: 110 }}
              value={it.amount}
              required
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
            {items.length > 1 && (
              <button type="button" className="secondary" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>
            )}
          </div>
        ))}
        <div className="row">
          <button type="button" className="secondary" onClick={() => setItems([...items, { description: "", amount: "" }])}>
            + Line item
          </button>
          <button disabled={saving}>{saving ? "Saving…" : "Create draft"}</button>
        </div>
      </form>

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 && !error ? (
        <div className="empty">No expenses yet. Create your first request above.</div>
      ) : (
        expenses.map((x) => (
          <ExpenseCard key={x.id} expense={x}>
            {canTransition(x.status, "submit") && (
              <button disabled={busyId === x.id} onClick={() => submit(x.id)}>
                {busyId === x.id ? "Submitting…" : "Submit for approval"}
              </button>
            )}
          </ExpenseCard>
        ))
      )}
      {error && !loading && <button className="secondary" onClick={load}>Retry</button>}
    </>
  );
}
