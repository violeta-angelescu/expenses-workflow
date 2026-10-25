import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { transition, TransitionError } from "@/lib/expenseMachine";
import { handleApiError } from "@/lib/apiError";
import { parseTransitionBody } from "@/lib/validate";

/** Validates and applies an expense transition, then saves it conditionally. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const body = parseTransitionBody(rawBody);
    if (typeof body === "string") return NextResponse.json({ error: body }, { status: 400 });

    const expense = await store.get(id);
    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    const next = transition(expense, body.event, { comment: body.comment ?? undefined });
    if (!(await store.save(next, expense.status))) {
      return NextResponse.json(
        { error: "Expense could not be updated because it has changed" },
        { status: 409 },
      );
    }
    return NextResponse.json(next);
  } catch (err) {
    if (err instanceof TransitionError) {
      return NextResponse.json({ error: err.message }, { status: err.kind === "invalid_transition" ? 409 : 422 });
    }
    return handleApiError(err, req);
  }
}
