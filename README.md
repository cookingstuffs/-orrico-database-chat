# Orrico Database Chat

Orrico is a full-stack retail analytics application that combines a conversational query interface with dashboard views for sales, customers, inventory, and orders. The project includes authentication, demo access, CSV import, schema inspection, and backend APIs for day-to-day data exploration workflows.

## Features

- email/password authentication
- demo account for walkthroughs
- password hashing and expiring API sessions
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

- Node.js 18 or newer
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

## Environment Variables

Create a local `.env` file using `.env.example` as a reference.

```env
API_BASE_URL=http://localhost:4000/api
SESSION_TTL_HOURS=720
APP_DATA_DIRECTORY=server/data
APP_ENCRYPTION_KEY=replace-with-a-strong-secret-key
```

## Demo Account

- Email: `demo@orrico.com`
- Password: `demo123`

## API Routes

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
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

- the application now persists users, sessions, connections, and chat history in SQLite
- stored database credentials are encrypted before persistence
- SQLite is the main working query engine in the current version, both for app state and demo/imported analytics data
- PostgreSQL and MySQL now support live connection testing and schema inspection
- SQLite remains the strongest path for built-in retail analytics and CSV-driven querying
- PostgreSQL/MySQL now support safe read-only schema and table queries
- Oracle remains a planned connector
- MySQL and PostgreSQL connection flows are present in the product, but live querying is still centered on SQLite-backed workflows

## License

This project is currently maintained as a private codebase.
