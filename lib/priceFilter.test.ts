import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePriceFilter } from "./priceFilter";

test("accepts empty, single-sided and ordered ranges", () => {
  for (const [minTotal, maxTotal] of [["", ""], ["5", ""], ["", "5"], ["5", "5"], ["1", "10.5"], [" 1 ", "2"]]) {
    assert.equal(validatePriceFilter({ minTotal, maxTotal }), undefined, `${minTotal}-${maxTotal}`);
  }
});

test("rejects max lower than min", () => {
  assert.deepEqual(validatePriceFilter({ minTotal: "10", maxTotal: "9.99" }), {
    minTotal: undefined,
    maxTotal: "Max price cannot be lower than min price",
  });
});

test("rejects negative and non-numeric values", () => {
  assert.ok(validatePriceFilter({ minTotal: "-1", maxTotal: "" })?.minTotal);
  assert.ok(validatePriceFilter({ minTotal: "", maxTotal: "abc" })?.maxTotal);
  assert.ok(validatePriceFilter({ minTotal: "Infinity", maxTotal: "" })?.minTotal);
});
