# Orrico Database Chat

Orrico is a full-stack retail analytics application that combines a conversational query interface with dashboard views for sales, customers, inventory, and orders. The project includes authentication, demo access, CSV import, schema inspection, and backend APIs for day-to-day data exploration workflows.

## Features

- email/password authentication
- demo account for walkthroughs
- password hashing, expiring API sessions, email verification, and password reset
- chat-based querying for retail data
- voice input in chat
- dashboard views for business metrics
- CSV import into SQLite
- schema-aware querying for imported tables
- live PostgreSQL/MySQL connection testing and schema inspection
- safe read-only table queries across SQLite, PostgreSQL, and MySQL
- persisted chat history for signed-in users
- database connection setup for MySQL, PostgreSQL, Oracle, and SQLite

## Tech Stack

- React 18
- Parcel
- Tailwind CSS
- Node.js
- Express
- SQLite
- PostgreSQL (optional app persistence via `DATABASE_URL`)

## Project Structure

```text
.
|-- api/
|-- server/
|-- src/
|   |-- components/
|   |-- data/
|   `-- lib/
|-- index.html
|-- package.json
|-- vercel.json
`-- README.md
```

## Local Setup

### Prerequisites

- Node.js 24.x
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

This starts:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

### Production build

```bash
npm run build
```

### Production smoke test

```bash
npm run smoke:prod
```

Optional:

```bash
SMOKE_BASE_URL=https://your-production-domain npm run smoke:prod
```

## Environment Variables

Create a local `.env` file using `.env.example` as a reference.

```env
API_BASE_URL=http://localhost:4000/api
SESSION_TTL_HOURS=720
PASSWORD_RESET_TTL_HOURS=2
EMAIL_VERIFICATION_TTL_HOURS=24
APP_DATA_DIRECTORY=server/data
APP_ENCRYPTION_KEY=replace-with-a-strong-secret-key
DATABASE_URL=
PGSSL=disable
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=no-reply@example.com
EMAIL_REPLY_TO=support@example.com
APP_BASE_URL=http://localhost:3000
```

## Demo Account

- Email: `demo@orrico.com`
- Password: `demo123`

## API Routes

- `GET /api/health`
- `GET /api/health/ready`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/verify-email/request`
- `POST /api/auth/verify-email/confirm`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/database/current`
- `GET /api/database/schema`
- `POST /api/database/test`
- `POST /api/database/connect`
- `POST /api/database/import-csv`
- `POST /api/chat/message`
- `GET /api/chat/history`

## Notes

- the application persists users, sessions, connections, chat history, and auth tokens in SQLite by default
- if `DATABASE_URL` is configured, app persistence moves to PostgreSQL with a migration path from the existing SQLite snapshot
- stored database credentials are encrypted before persistence
- verification and reset emails are provider-backed when `RESEND_API_KEY` and sender env vars are configured
- `GET /api/health` exposes runtime/storage status and config warnings
- `GET /api/health/ready` returns `503` until the store is reachable and required production env vars are configured
- SQLite is the main working query engine in the current version, both for app state and demo/imported analytics data
- PostgreSQL and MySQL now support live connection testing and schema inspection
- SQLite remains the strongest path for built-in retail analytics and CSV-driven querying
- PostgreSQL/MySQL now support safe read-only schema and table queries
- Oracle remains a planned connector
- MySQL and PostgreSQL connection flows are present in the product, but live querying is still centered on SQLite-backed workflows

## Launch Checklist

Before launch, complete these items:

1. configure production Vercel env vars:
   - `DATABASE_URL`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `APP_BASE_URL`
   - `APP_ENCRYPTION_KEY`
   - `CORS_ALLOWED_ORIGINS`
2. redeploy production
3. verify `GET /api/health/ready` returns `200`
4. run `npm run smoke:prod`
5. manually test:
   - signup
   - email verification
   - login/logout
   - password reset
   - dashboard load
   - product/customer/order write flows
   - CSV import
   - chat history

## License

This project is currently maintained as a private codebase.
