# Orrico AI Retail Copilot

Orrico is an AI-first retail intelligence web application designed to make store data feel conversational, accessible, and actionable. Instead of forcing users through rigid dashboards alone, the product blends analytics, onboarding, voice-enabled chat, and data exploration into a single assistant-led experience for modern retail teams.

The current codebase delivers a full-stack product foundation with a React frontend, an Express backend, SQLite-powered demo analytics, CSV import workflows, schema-aware querying, and Vercel-ready deployment routing. It is built to look and feel like an AI product, while still keeping the implementation practical, transparent, and extensible.

## Why Orrico

Retail owners and operators usually have data spread across dashboards, spreadsheets, billing systems, and exports. Orrico reframes that workflow around a conversational copilot that helps users:

- explore sales, inventory, orders, and customer activity
- ask business questions in natural language
- inspect uploaded datasets without manual SQL knowledge
- move from onboarding to insight discovery inside one guided product flow

## AI Product Experience

The repository is intentionally shaped around an AI-native user experience:

- conversational business assistant with voice input support
- dashboard plus chat workflow for blended analytics exploration
- schema-aware query responses for demo and imported datasets
- onboarding and demo flows built for product walkthroughs and showcases
- human-friendly interface patterns that make the app feel assistant-led rather than tool-heavy

Important implementation note: the current natural-language querying flow is schema-aware and rule-driven. It is not yet a full LLM-powered universal SQL generation system.

## Core Capabilities

- Email/password authentication
- Google sign-in integration support
- Demo account access for product presentations
- Conversational retail analytics workflow
- Voice-enabled chat interaction
- SQLite-backed demo database for out-of-the-box exploration
- CSV import with automatic table creation and type inference
- Schema inspection and query support for imported SQLite tables
- Database connection flows for MySQL, PostgreSQL, Oracle, and SQLite
- Frontend + backend deployment support on Vercel

## Tech Stack

- Frontend: React 18, Parcel, Tailwind CSS, Radix UI, Recharts
- Backend: Node.js, Express
- Data layer: SQLite for demo/imported data, JSON-backed persistence for auth and session state
- Interaction layer: browser speech recognition for voice chat input
- Deployment: Vercel-compatible frontend build with API routing

## Repository Structure

```text
.
|-- api/                 # Vercel API entrypoint
|-- server/              # Express app, storage helpers, query engine, demo DB logic
|-- src/                 # React application source
|   |-- components/      # Pages, chat UI, dashboard UI, onboarding flows
|   |-- data/            # Local assistant and product helper data
|   `-- lib/             # Frontend API client utilities
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

### Run the app locally

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

Create a Google OAuth Web Client ID and add these authorized JavaScript origins:

- `http://localhost:3000`
- your production frontend URL

Only the client ID is required in the frontend environment. Do not expose a Google client secret in client-side code.

## Demo Access

The application includes a built-in demo account for product reviews and walkthroughs:

- Email: `demo@orrico.com`
- Password: `demo123`

## Current Data Workflow

Orrico currently supports two working data paths:

1. Built-in retail demo data for instant product exploration
2. CSV import into SQLite for querying custom tabular datasets

Once CSV data is imported, the assistant can answer practical prompts such as:

- `count rows from sample_orders`
- `sum total from sample_orders`
- `show top 5 by total from sample_orders`
- `show schema`

Supported query behaviors currently include:

- row counts
- sums and averages
- top-N rankings by numeric fields
- preview-style table reads
- schema inspection

## API Summary

The backend currently exposes:

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

The project is configured so the frontend and backend can ship together on Vercel.

Current deployment model:

- frontend assets build into `dist`
- API traffic is routed through `api/index.js`
- Express routes are shared between local development and deployed environments

## Product Status

This repository already works well as a strong AI-product prototype, showcase build, and extensible full-stack foundation. It supports real query execution over SQLite-backed data and provides a cohesive assistant-led UX, but it is not yet a production-hardened analytics platform.

At the moment:

- auth and session persistence are JSON/file-backed
- deployed storage is not yet durable enough for long-term production use
- password handling still needs production-grade hardening
- live query execution is strongest for SQLite-backed flows
- NL-to-SQL behavior is structured and schema-aware, not fully model-generated

## Roadmap Direction

The clearest next evolution for Orrico is to deepen the AI layer and productionize the data architecture:

- move persistence to PostgreSQL
- harden authentication and session security
- support durable hosted storage for deployed environments
- expand live query execution for MySQL and PostgreSQL
- introduce broader AI-assisted SQL planning for arbitrary schemas
- add CI coverage and automated testing for frontend and backend workflows

## License

This project is currently maintained as a private product codebase.
