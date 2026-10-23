import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCreateBody } from "@/lib/validate";
import type { ExpenseStatus } from "@/lib/types";

export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const status = params.get("status") as ExpenseStatus | null;
  const q = params.get("q")?.trim().toLowerCase();

  const result = store.list().filter((e) => {
    if (status && e.status !== status) return false;
    if (!q) return true;
    return e.title.toLowerCase().includes(q) || e.lineItems.some((li) => li.description.toLowerCase().includes(q));
  });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseCreateBody(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  return NextResponse.json(store.create(parsed.title, parsed.lineItems), { status: 201 });
}
