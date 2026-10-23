"use client";

import { useRef, useState } from "react";
import { ExpenseLineItem } from "./ExpenseLineItem";

export interface ExpenseFormItem {
  description: string;
  amount: string;
}

export interface ExpenseFormData {
  title: string;
  items: ExpenseFormItem[];
}

interface ExpenseFormProps {
  saving?: boolean;
  onCreate: (expense: ExpenseFormData) => Promise<boolean>;
}

const emptyLineItem = (): ExpenseFormItem => ({ description: "", amount: "" });

interface FormItem extends ExpenseFormItem {
  id: number;
}

export function ExpenseForm({ saving = false, onCreate }: ExpenseFormProps) {
  const nextItemId = useRef(0);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<FormItem[]>(() => [
    { ...emptyLineItem(), id: nextItemId.current++ },
  ]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (
        await onCreate({
          title,
          items: items.map(({ id: _id, ...item }) => item),
        })
      ) {
        setTitle("");
        setItems([{ ...emptyLineItem(), id: nextItemId.current++ }]);
      }
    } catch {
      // Consumers can report the error while keeping the draft available for retry.
    }
  }

  function updateItem(index: number, changes: Partial<ExpenseFormItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { ...emptyLineItem(), id: nextItemId.current++ },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <form className="card" onSubmit={create}>
      <h2 style={{ marginTop: 0 }}>New expense</h2>
      <div className="form-row">
        <label className="sr-only" htmlFor="expense-title">
          Title
        </label>
        <input
          id="expense-title"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={saving}
        />
      </div>
      {items.map((item, index) => (
        <ExpenseLineItem
          key={item.id}
          item={item}
          itemId={item.id}
          itemNumber={index + 1}
          disabled={saving}
          canRemove={items.length > 1}
          onChange={(changes) => updateItem(index, changes)}
          onRemove={() => removeItem(index)}
        />
      ))}
      <div className="row">
        <button
          type="button"
          className="secondary"
          onClick={addItem}
          disabled={saving}
        >
          + Line item
        </button>
        <button disabled={saving}>{saving ? "Saving…" : "Create draft"}</button>
      </div>
    </form>
  );
}
