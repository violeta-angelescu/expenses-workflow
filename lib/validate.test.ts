import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_AMOUNT,
  MAX_COMMENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LINE_ITEMS,
  MAX_TITLE_LENGTH,
  parseCreateBody,
  parseTransitionBody,
} from "./validate";

const item = { description: "a", amount: 1 };
const create = (overrides: object = {}) => parseCreateBody({ title: "t", lineItems: [item], ...overrides });
const withAmount = (amount: unknown) => create({ lineItems: [{ ...item, amount }] });
const assertValid = (result: unknown) => assert.notEqual(typeof result, "string");
const assertInvalid = (result: unknown, message?: string) => assert.equal(typeof result, "string", message);

test("accepts a valid body and trims text", () => {
  const result = create({ title: " t ", lineItems: [{ description: " a ", amount: 12.34 }] });
  assert.deepEqual(result, { title: "t", lineItems: [{ description: "a", amount: 12.34 }] });
});

test("rejects amounts that are not whole cents, positive and within the limit", () => {
  for (const amount of [0.001, 0, -1, NaN, Infinity, MAX_AMOUNT + 0.01, "5"]) {
    assertInvalid(withAmount(amount), String(amount));
  }
  for (const amount of [0.01, 19.99, MAX_AMOUNT]) {
    assertValid(withAmount(amount));
  }
});

test("enforces title, description and line item limits", () => {
  assertInvalid(create({ title: " " }));
  assertValid(create({ title: "x".repeat(MAX_TITLE_LENGTH) }));
  assertInvalid(create({ title: "x".repeat(MAX_TITLE_LENGTH + 1) }));

  const describe = (description: string) => create({ lineItems: [{ ...item, description }] });
  assertValid(describe("x".repeat(MAX_DESCRIPTION_LENGTH)));
  assertInvalid(describe("x".repeat(MAX_DESCRIPTION_LENGTH + 1)));

  const items = (n: number) => Array.from({ length: n }, () => item);
  assertInvalid(create({ lineItems: [] }));
  assertValid(create({ lineItems: items(MAX_LINE_ITEMS) }));
  assertInvalid(create({ lineItems: items(MAX_LINE_ITEMS + 1) }));

  assertInvalid(parseCreateBody(null));
});

test("transition body validates event and comment", () => {
  assertValid(parseTransitionBody({ event: "approve", comment: null }));
  assertValid(parseTransitionBody({ event: "reject", comment: "x".repeat(MAX_COMMENT_LENGTH) }));
  assertInvalid(parseTransitionBody({ event: "reject", comment: "x".repeat(MAX_COMMENT_LENGTH + 1) }));
  assertInvalid(parseTransitionBody({ event: "reject", comment: 5 }));
  assertInvalid(parseTransitionBody({ event: "nope" }));
});
