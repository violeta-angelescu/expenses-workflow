import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCreateBody } from "./validate";

const body = (amount: unknown) => ({ title: "t", lineItems: [{ description: "a", amount }] });

test("accepts a valid body and trims text", () => {
  const r = parseCreateBody({ title: " t ", lineItems: [{ description: " a ", amount: 12.34 }] });
  assert.deepEqual(r, { title: "t", lineItems: [{ description: "a", amount: 12.34 }] });
});

test("rejects amounts that are not whole cents, non-positive or too large", () => {
  for (const amount of [0.001, 1e-7, 0, -1, NaN, Infinity, 1.7e308, 1_000_000.01, "5"]) {
    assert.equal(typeof parseCreateBody(body(amount)), "string", String(amount));
  }
  assert.equal(typeof parseCreateBody(body(0.01)), "object");
  assert.equal(typeof parseCreateBody(body(19.99)), "object");
});

test("rejects missing or oversized text and too many items", () => {
  assert.equal(typeof parseCreateBody({ ...body(1), title: " " }), "string");
  assert.equal(typeof parseCreateBody({ ...body(1), title: "x".repeat(201) }), "string");
  assert.equal(typeof parseCreateBody({ title: "t", lineItems: [{ description: "x".repeat(201), amount: 1 }] }), "string");
  const many = Array.from({ length: 51 }, () => ({ description: "a", amount: 1 }));
  assert.equal(typeof parseCreateBody({ title: "t", lineItems: many }), "string");
  assert.equal(typeof parseCreateBody(null), "string");
});
