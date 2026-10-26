import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The pages talk to the server only through `api`; tests script it with vi.mocked(api.*).
vi.mock("@/lib/api", () => ({ api: { list: vi.fn(), create: vi.fn(), transition: vi.fn() } }));

afterEach(cleanup);
