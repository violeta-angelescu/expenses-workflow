"use client";

import { useState } from "react";

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

const emptyItem = (): ExpenseFormItem => ({ description: "", amount: "" });

export function ExpenseForm({ saving = false, onCreate }: ExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ExpenseFormItem[]>([emptyItem()]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onCreate({ title, items })) {
      setTitle("");
      setItems([emptyItem()]);
    }
  }

  function updateItem(index: number, changes: Partial<ExpenseFormItem>) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...changes } : item
    )));
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <form className="card" onSubmit={create}>
      <h2 style={{ marginTop: 0 }}>New expense</h2>
      <div className="form-row">
        <input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>
      {items.map((item, index) => (
        <div className="form-row" key={index}>
          <input
            placeholder="Description"
            value={item.description}
            required
            onChange={(event) => updateItem(index, { description: event.target.value })}
          />
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            style={{ width: 110 }}
            value={item.amount}
            required
            onChange={(event) => updateItem(index, { amount: event.target.value })}
          />
          {items.length > 1 && (
            <button type="button" className="secondary" onClick={() => removeItem(index)}>
              ×
            </button>
          )}
        </div>
      ))}
      <div className="row">
        <button type="button" className="secondary" onClick={addItem}>
          + Line item
        </button>
        <button disabled={saving}>{saving ? "Saving…" : "Create draft"}</button>
      </div>
    </form>
  );
}
