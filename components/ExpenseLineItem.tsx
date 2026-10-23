"use client";

import type { ExpenseFormItem } from "./ExpenseForm";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
      <Label className="sr-only" htmlFor={`expense-description-${itemId}`}>
        Description
      </Label>
      <Input
        id={`expense-description-${itemId}`}
        placeholder="Description"
        value={item.description}
        required
        disabled={disabled}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <Label className="sr-only" htmlFor={`expense-amount-${itemId}`}>
        Amount
      </Label>
      <Input
        id={`expense-amount-${itemId}`}
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Amount"
        className="w-[110px]"
        value={item.amount}
        required
        disabled={disabled}
        onChange={(event) => onChange({ amount: event.target.value })}
      />
      {canRemove && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove line item ${itemNumber}`}
        >
          ×
        </Button>
      )}
    </div>
  );
}
