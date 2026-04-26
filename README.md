# Orrico Retail Intelligence

Orrico is a full-stack retail analytics application that combines a conversational query interface with dashboard views for sales, customers, inventory, and orders. The project includes authentication, demo access, CSV import, schema inspection, and backend APIs for data exploration workflows.

## Features

- email/password authentication
- Google sign-in support
- demo account for walkthroughs
- chat-based querying for retail data
- voice input in chat
- dashboard views for business metrics
- CSV import into SQLite
- schema-aware querying for imported tables
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
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
API_BASE_URL=http://localhost:4000/api
```

## Demo Account

- Email: `demo@orrico.com`
- Password: `demo123`

## API Routes

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

## Notes

- the current deployed storage layer is file-backed
- SQLite is the main working query engine in the current version
- MySQL and PostgreSQL connection flows are present in the product, but live querying is still centered on SQLite-backed workflows

## License

This project is currently maintained as a private codebase.
