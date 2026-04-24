# Orrico Retail Intelligence

Orrico Retail Intelligence is a full-stack retail analytics application built to help shop owners explore sales, customers, inventory, and operational performance through a dashboard and a conversational business assistant.

The product combines a React frontend, an Express-based API layer, and a lightweight SQLite-backed analytics workflow to support onboarding, demo access, schema inspection, CSV import, and natural-language business queries in one cohesive experience.

## Overview

Orrico is designed around a simple product idea: business users should be able to ask practical questions about their store data without relying entirely on manual reports, spreadsheets, or admin-heavy BI tools.

The current implementation includes:

- retail-focused landing, onboarding, and authentication flows
- demo login and guided product walkthrough support
- dashboard views for sales, inventory, customers, and orders
- chat-based business assistant with voice input support
- SQLite-backed schema inspection and query execution
- CSV import into SQLite for custom dataset exploration
- database connection workflows for MySQL, PostgreSQL, Oracle, and SQLite
- Vercel-compatible API deployment routing for frontend + backend delivery

## Key Features

- Email/password authentication
- Google sign-in integration support
- Demo account access for product showcases
- Conversational analytics experience
- Natural-language querying for built-in retail data
- Schema-aware querying for imported SQLite tables
- CSV import with automatic table creation and column type inference
- Responsive chat and dashboard layouts
- Basic session handling and backend persistence

## Technology Stack

- Frontend: React 18, Parcel, Tailwind CSS, Radix UI, Recharts
- Backend: Node.js, Express
- Data layer: SQLite for demo and imported tabular data, file-backed JSON for auth/session persistence
- UX capabilities: voice input via browser speech recognition
- Deployment: Vercel static frontend with routed API function support

## Repository Structure

```text
.
|-- api/                 # Vercel API entrypoint
|-- server/              # Express app, query engine, demo database helpers, storage
|-- src/                 # React application source
|   |-- components/      # Screens, layouts, and shared UI components
|   |-- data/            # Local intent and helper data
|   `-- lib/             # Frontend API client
|-- index.html           # Parcel entrypoint
|-- package.json
|-- vercel.json
`-- README.md
```

## Local Development

### Prerequisites

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Start the app locally

```bash
npm run dev
```

This starts:

- Frontend at `http://localhost:3000`
- Backend API at `http://localhost:4000`

### Build for production

```bash
npm run build
```

### Start the backend only

```bash
npm start
```

## Environment Variables

Create a local `.env` file when needed.

```env
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
API_BASE_URL=http://localhost:4000/api
```

### Google Sign-In Setup

Create a Google OAuth Web Client ID and add the following authorized JavaScript origins:

- `http://localhost:3000`
- your production frontend URL

Only the client ID is required on the frontend. Do not expose a Google client secret in client-side code.

## Demo Access

The application includes a demo account for product reviews and walkthroughs:

- Email: `demo@orrico.com`
- Password: `demo123`

## Current Data Workflow

Orrico currently supports two practical data paths:

1. Built-in retail demo data for immediate exploration
2. CSV import into a SQLite database for custom dataset querying

Once CSV data is imported, the assistant can inspect schema and answer common queries such as:

- row counts
- sums and averages
- top-N rankings by numeric columns
- preview queries on imported tables

Example prompts:

- `count rows from sample_orders`
- `sum total from sample_orders`
- `show top 5 by total from sample_orders`
- `show schema`

## API Summary

The backend currently exposes the following routes:

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/database/current`
- `GET /api/database/schema`
- `POST /api/database/connect`
- `POST /api/database/import-csv`
- `POST /api/chat/message`

## Deployment Notes

The project is configured so the frontend can be deployed alongside an API entrypoint on Vercel.

Current deployment behavior:

- frontend assets are built into `dist`
- API requests are routed to `api/index.js`
- Express routes are shared between local and deployed environments

## Implementation Notes

This repository is a strong product foundation for demos, internal reviews, and iterative feature development. It already supports real query execution over SQLite-backed data, but it is not yet a production-hardened analytics platform.

At the moment:

- auth/session persistence is file-backed rather than database-backed
- deployed storage is not yet durable in the way a production data service should be
- passwords are not yet hardened with production-grade hashing
- MySQL/PostgreSQL/Oracle connection flows are product-facing, but the live query engine is currently centered on SQLite-backed workflows
- natural-language querying is rule-driven and schema-aware, not yet full LLM-based SQL generation

## Recommended Next Steps

- move auth, sessions, and application persistence to PostgreSQL
- add password hashing and stronger session security
- add durable hosted storage for deployed environments
- expand live query execution for MySQL and PostgreSQL connectors
- add broader NL-to-SQL planning for arbitrary imported schemas
- add automated tests and CI checks for frontend and backend flows

## License

This project is currently maintained as a private product codebase.
