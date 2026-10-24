# Expense Approval Workflow

Build a expense approval workflow with state machine validation in a Next.js application. Build an expense approval workflow in a Next.js application. The starter project includes types, minimal seed data, a search component, and page shells with navigation.

## Feature

### Expense requests
Users create expense requests with a title and one or more line items (description + amount). The server computes the total from the line items.

### Status transitions 
Expenses follow this lifecycle: `draft` → `submitted` → `approved` or `rejected`. Invalid transitions should be rejected. Rejection requires a comment.

### Pages
User Requests (`/requests`) for viewing and creating expenses
Approval Queue (`/approvals`) for acting on submitted expenses.

### Search component
The approval queue page has a search component that requires attention.

### UI polish
Loading indicators, empty states, and error handling for failed API calls.

## Architecture and workflow

The Next.js pages call route handlers through the shared API client. The route
handlers delegate validation and state transitions to the domain logic, which
currently stores expenses in memory.

```mermaid
flowchart TD
    Browser["Browser"]

    subgraph NextJS["Next.js App"]
        Layout["app/layout.tsx"]
        Requests["/requests<br/>Create and submit expenses"]
        Approvals["/approvals<br/>Search and approve/reject"]
        Search["SearchInput<br/>300ms debounce"]
        APIClient["lib/api.ts"]
        Errors["error.tsx / global-error.tsx"]
    end

    subgraph API["Next.js Route Handlers"]
        ExpensesAPI["GET/POST<br/>/api/expenses"]
        TransitionAPI["POST<br/>/api/expenses/[id]/transition"]
    end

    subgraph Domain["Domain Logic"]
        Validate["lib/validate.ts<br/>Validate create requests"]
        Machine["lib/expenseMachine.ts<br/>Validate transitions"]
        Store["lib/store.ts<br/>MongoDB store"]
    end

    Browser --> Layout
    Layout --> Requests
    Layout --> Approvals
    Requests --> APIClient
    Approvals --> Search
    Search --> APIClient
    APIClient --> ExpensesAPI
    APIClient --> TransitionAPI
    ExpensesAPI --> Validate
    Validate --> Store
    ExpensesAPI --> Store
    TransitionAPI --> Machine
    Machine --> Store
    Store --> ExpensesAPI
    Store --> TransitionAPI
    APIClient -. network/API errors .-> Errors
    Requests -. render errors .-> Errors
    Approvals -. render errors .-> Errors
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

Expenses are persisted in MongoDB. The Docker Compose setup creates the indexes
and sample expenses when MongoDB initializes.

## Docker

Run the app and MongoDB together with:

```bash
docker compose up --build
```

The app is available at `http://localhost:3000`. MongoDB data is stored in the
`mongo-data` Docker volume.
