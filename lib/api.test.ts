import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "./api";

const originalFetch = globalThis.fetch;

test("list serializes filters and forwards its abort signal", async () => {
  let receivedUrl = "";
  let receivedSignal: AbortSignal | undefined;
  globalThis.fetch = async (input, init) => {
    receivedUrl = String(input);
    receivedSignal = init?.signal ?? undefined;
    return Response.json([]);
  };

  try {
    const controller = new AbortController();
    await api.list({ status: "submitted", q: "travel costs" }, controller.signal);
    assert.equal(receivedUrl, "/api/expenses?status=submitted&q=travel+costs");
    assert.equal(receivedSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("transition encodes the expense ID", async () => {
  let receivedUrl = "";
  globalThis.fetch = async (input) => {
    receivedUrl = String(input);
    return Response.json({ id: "a/b", status: "submitted" });
  };

  try {
    await api.transition("a/b", "submit");
    assert.equal(receivedUrl, "/api/expenses/a%2Fb/transition");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses API error text and falls back for malformed error responses", async () => {
  globalThis.fetch = async () => Response.json({ error: "Not allowed" }, { status: 403 });
  try {
    await assert.rejects(api.list(), { message: "Not allowed" });

    globalThis.fetch = async () => new Response("not JSON", { status: 502 });
    await assert.rejects(api.list(), { message: "Request failed (502)" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
