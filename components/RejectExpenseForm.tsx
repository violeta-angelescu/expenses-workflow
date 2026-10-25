"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
      <Label className="sr-only" htmlFor={rejectExpenseId}>
        Reason for rejection
      </Label>
      <Input
        id={rejectExpenseId}
        required
        autoFocus
        placeholder="Reason (required)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button variant="destructive" disabled={busy || !comment.trim()}>
        {busy ? "Rejecting…" : "Confirm rejection"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={cancel}
        disabled={busy}
      >
        Cancel
      </Button>
    </form>
  );
}
