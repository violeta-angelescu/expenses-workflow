## Overview

Expense approval workflow (Next.js App Router, React 19, Tailwind v4, shadcn/ui). Users create expenses with line items on `/requests`; approvers act on submitted ones on `/approvals`. Lifecycle: `draft` → `submitted` → `approved` | `rejected` (rejection requires a comment). The server computes `total` from line items.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm test` — runs `tsx --test lib/*.test.ts` (Node test runner). Single file: `npx tsx --test lib/expenseMachine.test.ts`. `lib/store.test.ts` needs MongoDB (`docker compose up -d mongo`) and uses a throwaway database.
- `npm run test:components` — Vitest + Testing Library tests for the pages (`app/**/page.test.tsx`), with `@/lib/api` mocked. Shared helpers in `tests/render.tsx`.
- `npm run test:e2e` — Playwright tests in `e2e/` against a real `next dev` (port 3100, `.next-e2e`) and MongoDB database `expense_approval_e2e`. First time: `npx playwright install chromium`.
- `npm run db:migrate` — applies pending `migrate-mongo` migrations from `db/migrations/` (config in `migrate-mongo-config.js`, honours `MONGODB_URI`/`MONGODB_DB`). Also `db:migrate:status`, `db:migrate:down`, `db:migrate:create <name>`. Run it before deploying code that needs the change. `docker compose up` runs it automatically through the one-shot `migrate` service (the `app` service waits for it), so migrations are the only place indexes are defined.
- No lint script is configured.

## Architecture

- **State machine** (`lib/expenseMachine.ts`): the single source of truth for valid transitions. 
A table of `status → event → { to, guard?, update? }`. 
Guards return an error message to refuse; 
`update` returns fields merged into the expense (e.g. `rejectionComment`). 
Add or change workflow rules here, not in routes or UI.

- **Store** (`lib/store.ts`): MongoDB-backed persistence using the shared client in `lib/db.ts`. Use Docker Compose to start the app and initialize MongoDB.

- **API routes** (`app/api/expenses/route.ts` for list/create with `status` and `q` filters; `app/api/expenses/[id]/transition/route.ts` for events). 
Routes validate input (`lib/validate.ts`), delegate to the store/machine, and wrap everything in try/catch calling `handleApiError` (`lib/apiError.ts`), which logs via pino (`lib/logger.ts`) and returns a generic 500 `{ error }`. Client errors return `{ error: string }` with 4xx.

- **Client** (`lib/api.ts`): typed fetch wrapper; throws `Error` with the server's `error` message, rethrows `AbortError` (list accepts an `AbortSignal` for search cancellation). Also exports `money()` formatter. 
Error boundaries (`app/error.tsx`, `app/global-error.tsx`) report via `lib/clientError.ts`.

- **Types** in `lib/types.ts` (`Expense`, `ExpenseStatus`, `ExpenseEvent`, `LineItem`).

- **UI**: pages in `app/requests` and `app/approvals`; shared components in `components/` (`ExpenseForm`, `ExpenseCard`, `SearchInput`, `StatusBadge`, etc.), shadcn config in `components.json`. Path alias `@/*` maps to the repo root.
