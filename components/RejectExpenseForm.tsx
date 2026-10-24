"use client";

import { useState } from "react";

export function RejectExpenseForm({
  expenseId,
  busy,
  onConfirm,
  onCancel,
}: {
  expenseId: string;
  busy: boolean;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const rejectExpenseId = `reject-${expenseId}`;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedComment = comment.trim();
    if (!trimmedComment) return;
    onConfirm(trimmedComment);
  }

  function cancel() {
    setComment("");
    onCancel();
  }

  return (
    <form className="form-row" onSubmit={submit}>
      <label className="sr-only" htmlFor={rejectExpenseId}>
        Reason for rejection
      </label>
      <input
        id={rejectExpenseId}
        required
        autoFocus
        placeholder="Reason (required)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <button className="danger" disabled={busy || !comment.trim()}>
        {busy ? "Rejecting…" : "Confirm rejection"}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={cancel}
        disabled={busy}
      >
        Cancel
      </button>
    </form>
  );
}
