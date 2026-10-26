import { z } from "zod";

// What may be typed into a price field: digits with at most one decimal point (a partial value like "5." is fine).
const priceInput = z.string().regex(/^\d*\.?\d*$/);
export const isPriceInput = (value: string) => priceInput.safeParse(value).success;

const price = z
  .string()
  .trim()
  // Number("") is 0, so an empty field passes without a special case.
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
    message: "Must be a non-negative number",
  });

export const priceFilterSchema = z
  .object({ minTotal: price, maxTotal: price })
  .refine(({ minTotal, maxTotal }) => !minTotal || !maxTotal || Number(maxTotal) >= Number(minTotal), {
    message: "Max price cannot be lower than min price",
    path: ["maxTotal"],
  });

/** Returns the first validation message per field, or undefined when the filter is valid. */
export function validatePriceFilter(input: { minTotal: string; maxTotal: string }) {
  const result = priceFilterSchema.safeParse(input);
  if (result.success) return undefined;

  const { fieldErrors } = z.flattenError(result.error);
  return { minTotal: fieldErrors.minTotal?.[0], maxTotal: fieldErrors.maxTotal?.[0] };
}
