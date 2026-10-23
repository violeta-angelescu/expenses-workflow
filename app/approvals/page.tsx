"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { ExpenseCard } from "@/components/ExpenseCard";
import { SearchInput } from "@/components/SearchInput";
import { Alert } from "@/components/Alert";
import { Spinner } from "@/components/Spinner";

export default function ApprovalsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async (q: string) => {
    controller.current?.abort(); // drop stale in-flight searches
    const ctrl = (controller.current = new AbortController());
    setLoading(true);
    setError(null);
    try {
      const data = await api.list({ status: "submitted", q }, ctrl.signal);
      setExpenses(data);
      setLoading(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setLoading(false);
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
      setComment("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1>Approval Queue</h1>
      <SearchInput onSearch={setQuery} placeholder="Search by title or line item…" />
      {error && (
        <Alert>
          <span>{error}</span>
          <button className="secondary" onClick={() => load(query)}>Retry</button>
        </Alert>
      )}
      {loading ? (
        <Spinner />
      ) : expenses.length === 0 && !error ? (
        <div className="empty">{query ? `No submitted expenses match “${query}”.` : "Nothing waiting for approval."}</div>
      ) : (
        expenses.map((x) => (
          <ExpenseCard key={x.id} expense={x}>
            {rejectingId === x.id ? (
              <form
                className="form-row"
                onSubmit={(e) => { e.preventDefault(); act(x.id, "reject", comment); }}
              >
                <input
                  autoFocus placeholder="Reason (required)" value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button className="danger" disabled={busyId === x.id || !comment.trim()}>Confirm</button>
                <button type="button" className="secondary" onClick={() => { setRejectingId(null); setComment(""); }}>Cancel</button>
              </form>
            ) : (
              <span className="form-row" style={{ margin: 0 }}>
                <button disabled={busyId === x.id} onClick={() => act(x.id, "approve")}>Approve</button>
                <button className="danger" disabled={busyId === x.id} onClick={() => setRejectingId(x.id)}>Reject</button>
              </span>
            )}
          </ExpenseCard>
        ))
      )}
    </>
  );
}
