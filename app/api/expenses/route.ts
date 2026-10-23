import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { parseCreateBody } from "@/lib/validate";
import { handleApiError } from "@/lib/apiError";
import type { ExpenseStatus } from "@/lib/types";

export function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const status = params.get("status") as ExpenseStatus | null;
    const q = params.get("q")?.trim().toLowerCase();

    const result = store.list().filter((e) => {
      if (status && e.status !== status) return false;
      if (!q) return true;
      return e.title.toLowerCase().includes(q) || e.lineItems.some((li) => li.description.toLowerCase().includes(q));
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "GET /api/expenses" });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = parseCreateBody(body);
    if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
    return NextResponse.json(store.create(parsed.title, parsed.lineItems), { status: 201 });
  } catch (error) {
    return handleApiError(error, { route: "POST /api/expenses" });
  }
}
