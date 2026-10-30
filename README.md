# Expense Approval Workflow

An expense approval workflow with state machine validation in a Next.js application.

<img src="./images/expenses approval flow requests page.png"/>
<img src="./images/expenses approval flow approval page.png"/>

## Features

### Expense requests
Users create expense requests with a title and one or more line items (description + amount). The server computes the total from the line items.

### Status transitions 
Expenses follow this lifecycle: `draft` → `submitted` → `approved` or `rejected`. Invalid transitions should be rejected. Rejection requires a comment.

### Pages
User Requests (`/requests`) for viewing and creating expenses
Approval Queue (`/approvals`) for acting on submitted expenses.

### Search and filters
Both pages list expenses through `GET /api/expenses`, which supports:

- `status`: filter by lifecycle status (the approval queue uses `submitted`).
- `q`: case-insensitive substring search over the title and line item descriptions. It is a regex scan
  (the query is escaped and capped at 100 characters), so partial words like "Sev" match "Sevilla trip".
- `minTotal` / `maxTotal`: inclusive price bounds. The price fields only accept digits and one decimal
  point; invalid or inverted ranges are rejected with a 400.
- `cursor`: cursor-based pagination (newest first). Responses are `{ items, nextCursor? }`, and the
  approval queue has previous/next controls. Search input is debounced by 300ms and in-flight requests are
  aborted.

## Quick Start

### Prerequisites
- Node.js >= 26.0
- npm 11.x
- MongoDB (local or Docker)

### Installation

```bash
# Install dependencies
npm install

# Start MongoDB with Docker
docker compose up -d mongo

# Apply database migrations
npm run db:migrate

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Running Commands

### Development
```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Build for production
npm start        # Start production server
```

### Testing
```bash
npm test                # Run unit tests (lib/*.test.ts)
npm run test:components # Run component tests with Vitest + Testing Library
npm run test:e2e        # Run Playwright e2e tests (requires `npm run dev` on port 3100)
```

### Database
```bash
npm run db:migrate        # Apply pending migrations
npm run db:migrate:status # Check migration status
npm run db:migrate:down   # Rollback last migration
npm run db:migrate:create # Create a new migration
```

## Architecture and workflow

The Next.js pages call route handlers through the shared API client. The route
handlers delegate validation and state transitions to the domain logic, which
persists expenses in MongoDB. Transitions are written only if the stored status
still matches the status that was validated, preventing concurrent requests
from applying conflicting actions.

```mermaid
flowchart TD
    Browser["Browser"]

    subgraph NextJS["Next.js App"]
        Layout["app/layout.tsx<br/>QueryProvider"]
        Home["app/page.tsx<br/>Navigation"]
        Requests["/requests<br/>Create & submit expenses"]
        Approvals["/approvals<br/>Search, filters, pagination<br/>approve/reject"]
        
        subgraph Components["Components"]
            ExpenseForm["ExpenseForm<br/>onCreate callback"]
            SearchInput["SearchInput<br/>300ms debounce"]
            PriceFilter["PriceFilter<br/>min/max validation"]
            PageErrorAlert["PageErrorAlert<br/>Error display"]
        end
        
        subgraph ErrorHandling["Error Handling"]
            ErrorBoundary["error.tsx<br/>global-error.tsx"]
            ClientError["lib/clientError.ts<br/>reportClientError"]
        end
        
        APIClient["lib/api.ts<br/>Typed fetch wrapper"]
    end

    subgraph API["Next.js Route Handlers"]
        ExpensesAPI["GET/POST<br/>/api/expenses<br/>status, q, minTotal, maxTotal, cursor"]
        TransitionAPI["POST<br/>/api/expenses/[id]/transition"]
    end

    subgraph Domain["Domain Logic"]
        Validate["lib/validate.ts<br/>Input validation Zod"]
        Machine["lib/expenseMachine.ts<br/>State transitions"]
        Store["lib/store.ts<br/>MongoDB persistence<br/>Cursor pagination"]
    end

    subgraph Data["Data"]
        Migrations["db/migrations<br/>migrate-mongo<br/>Create indexes"]
        Mongo[("MongoDB")]
    end

    Browser --> Layout
    Layout --> Home
    Home --> Requests
    Home --> Approvals
    
    Requests --> ExpenseForm
    ExpenseForm --> APIClient
    Approvals --> SearchInput
    Approvals --> PriceFilter
    SearchInput --> APIClient
    PriceFilter --> APIClient
    
    APIClient --> ExpensesAPI
    APIClient --> TransitionAPI
    
    ExpensesAPI --> Validate
    ExpensesAPI --> Store
    Validate --> Store
    
    TransitionAPI --> Machine
    Machine --> Store
    
    Store --> Mongo
    Migrations -. create indexes .-> Mongo
    
    APIClient -.->|API errors| ClientError
    ExpenseForm -.->|catch & report| ClientError
    ClientError -.->|console.error| Browser
    
    Requests -.->|catch errors| ErrorBoundary
    Approvals -.->|catch errors| ErrorBoundary
    Requests --> PageErrorAlert
    Approvals --> PageErrorAlert
```

Expense lifecycle:

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> submitted: submit
    submitted --> approved: approve
    submitted --> rejected: reject + comment
    draft --> draft: submit rejected if no line items
    submitted --> submitted: reject rejected if comment is empty
    approved --> [*]
    rejected --> [*]
```

Expenses are persisted in MongoDB. Indexes (pagination on `createdAt`/`_id` and
`status`/`createdAt`/`_id`) are defined only in `migrate-mongo` migrations under `db/migrations/`.
Docker Compose runs them through a one-shot `migrate` service that the app waits for, and sample
expenses are seeded when MongoDB initializes (`docker/mongo-seed.js`).

## Docker

Run the entire stack (app + MongoDB) with:

```bash
docker compose up --build
```

The app will be available at `http://localhost:3000`. MongoDB data is persisted in the `mongo-data` Docker volume. Migrations run automatically on startup through the `migrate` service.

## Environment Variables

Set these in a `.env.local` file for local development:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=expense_approval
NODE_ENV=development
```

For production deployments, set `MONGODB_URI` and `MONGODB_DB` to point to your MongoDB instance.

## Project Structure

- **`app/`** — Next.js App Router pages and API routes
  - `requests/` — User expense requests page
  - `approvals/` — Approval queue page
  - `api/expenses/` — REST API endpoints
- **`components/`** — React components (shadcn/ui)
- **`lib/`** — Domain logic
  - `expenseMachine.ts` — State machine for expense transitions
  - `store.ts` — MongoDB persistence layer
  - `validate.ts` — Input validation (Zod)
  - `api.ts` — Typed fetch client
  - `clientError.ts` — Error handling and reporting
  - `types.ts` — TypeScript type definitions
- **`db/migrations/`** — Database migrations (migrate-mongo)
- **`e2e/`** — Playwright end-to-end tests
- **`tests/`** — Component test utilities

## Tech stack

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D26-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![npm](https://img.shields.io/badge/npm-11.x-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/) [![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![MongoDB](https://img.shields.io/badge/MongoDB-7.7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/) [![Playwright](https://img.shields.io/badge/Playwright-1.64-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)