"use client";

import type { ExpenseFormItem } from "./ExpenseForm";

interface ExpenseLineItemProps {
  item: ExpenseFormItem;
  itemId: number;
  itemNumber: number;
  disabled: boolean;
  canRemove: boolean;
  onChange: (changes: Partial<ExpenseFormItem>) => void;
  onRemove: () => void;
}

export function ExpenseLineItem({
  item,
  itemId,
  itemNumber,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: ExpenseLineItemProps) {
  return (
    <div className="form-row">
      <label className="sr-only" htmlFor={`expense-description-${itemId}`}>
        Description
      </label>
      <input
        id={`expense-description-${itemId}`}
        placeholder="Description"
        value={item.description}
        required
        disabled={disabled}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <label className="sr-only" htmlFor={`expense-amount-${itemId}`}>
        Amount
      </label>
      <input
        id={`expense-amount-${itemId}`}
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Amount"
        style={{ width: 110 }}
        value={item.amount}
        required
        disabled={disabled}
        onChange={(event) => onChange({ amount: event.target.value })}
      />
      {canRemove && (
        <button
          type="button"
          className="secondary"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove line item ${itemNumber}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
