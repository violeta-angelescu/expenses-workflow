import { test } from "node:test";
import assert from "node:assert/strict";
import { getClientErrorMessage } from "./clientError";
import { ApiError } from "./errors";

test("returns API messages and ignores aborted requests", () => {
  assert.equal(getClientErrorMessage(new ApiError("Not allowed", 403)), "Not allowed");

  const aborted = new Error("cancelled");
  aborted.name = "AbortError";
  assert.equal(getClientErrorMessage(aborted), null);
});

test("uses a safe fallback for unknown errors", () => {
  assert.equal(getClientErrorMessage(new Error("internal details")), "Something went wrong. Please try again.");
});
