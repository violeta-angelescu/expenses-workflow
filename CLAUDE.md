## Overview

Expense approval workflow (Next.js App Router, React 19, Tailwind v4, shadcn/ui). Users create expenses with line items on `/requests`; approvers act on submitted ones on `/approvals`. Lifecycle: `draft` → `submitted` → `approved` | `rejected` (rejection requires a comment). The server computes `total` from line items.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm test` — runs `tsx --test lib/*.test.ts` (Node test runner). Single file: `npx tsx --test lib/expenseMachine.test.ts`
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
