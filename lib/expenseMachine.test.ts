import { test } from "node:test";
import assert from "node:assert/strict";
import { transition, TransitionError } from "./expenseMachine";
import type { Expense } from "./types";

const base: Expense = {
  id: "1", title: "t", lineItems: [{ description: "a", amount: 5 }], total: 5,
  status: "draft", createdAt: "", updatedAt: "",
};

test("draft -> submitted -> approved", () => {
  const s = transition(base, "submit");
  assert.equal(s.status, "submitted");
  assert.equal(transition(s, "approve").status, "approved");
});

test("reject requires comment", () => {
  const s = transition(base, "submit");
  assert.throws(() => transition(s, "reject"), TransitionError);
  assert.throws(() => transition(s, "reject", { comment: "  " }), TransitionError);
  const r = transition(s, "reject", { comment: " too high " });
  assert.equal(r.status, "rejected");
  assert.equal(r.rejectionComment, "too high");
});

test("invalid transitions are refused", () => {
  assert.throws(() => transition(base, "approve"), TransitionError);
  const done = transition(transition(base, "submit"), "approve");
  assert.throws(() => transition(done, "submit"), TransitionError);
  assert.throws(() => transition(done, "reject", { comment: "x" }), TransitionError);
});
