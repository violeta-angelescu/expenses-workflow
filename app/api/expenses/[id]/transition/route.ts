import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { transition, TransitionError } from "@/lib/expenseMachine";
import { handleApiError } from "@/lib/apiError";
import type { ExpenseEvent } from "@/lib/types";

const EVENTS: ExpenseEvent[] = ["submit", "approve", "reject"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const expense = await store.get(id);
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as { event?: ExpenseEvent; comment?: string } | null;
    if (!body?.event || !EVENTS.includes(body.event)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
    if (body.comment !== undefined && body.comment !== null && typeof body.comment !== "string") {
      return NextResponse.json({ error: "Comment must be a string" }, { status: 400 });
    }
    const next = transition(expense, body.event, { comment: body.comment ?? undefined });
    return NextResponse.json(await store.save(next));
  } catch (err) {
    if (err instanceof TransitionError) {
      return NextResponse.json({ error: err.message }, { status: err.kind === "invalid_transition" ? 409 : 422 });
    }
    return handleApiError(err, { route: "POST /api/expenses/[id]/transition" });
  }
}
