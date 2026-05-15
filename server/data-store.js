import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const isVercelRuntime = Boolean(process.env.VERCEL);
const configuredDataDirectory = process.env.APP_DATA_DIRECTORY
  ? path.resolve(process.env.APP_DATA_DIRECTORY)
  : null;
const dataDirectory = configuredDataDirectory || (isVercelRuntime
  ? path.join(os.tmpdir(), "orrico-data")
  : path.resolve("server", "data"));
const databaseFilePath = path.join(dataDirectory, "app-data.sqlite");
const legacyJsonFilePath = path.join(dataDirectory, "app-data.json");

const defaultData = {
  users: [],
  sessions: [],
  databaseConnections: [],
  chatHistory: [],
};

function ensureDataDirectory() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
}

function openDatabase() {
  ensureDataDirectory();
  const database = new DatabaseSync(databaseFilePath);
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      business_name TEXT NOT NULL,
      password_hash TEXT,
      legacy_password TEXT,
      avatar_url TEXT,
      auth_provider TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS database_connections (
      user_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      reply TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return database;
}

function normalizeDataShape(data) {
  return {
    ...defaultData,
    ...data,
    users: Array.isArray(data?.users) ? data.users : [],
    sessions: Array.isArray(data?.sessions) ? data.sessions : [],
    databaseConnections: Array.isArray(data?.databaseConnections)
      ? data.databaseConnections
      : [],
    chatHistory: Array.isArray(data?.chatHistory)
      ? data.chatHistory
      : [],
  };
}

function getExistingUserCount(database) {
  const row = database
    .prepare(`SELECT COUNT(*) AS total FROM users`)
    .get();

  return Number(row?.total || 0);
}

function readLegacyJsonData() {
  if (!fs.existsSync(legacyJsonFilePath)) {
    return null;
  }

  try {
    const contents = fs.readFileSync(legacyJsonFilePath, "utf8");
    return normalizeDataShape(JSON.parse(contents));
  } catch {
    return null;
  }
}

function persistSnapshot(database, nextData) {
  const data = normalizeDataShape(nextData);

  database.exec("BEGIN");

  try {
    database.exec(`
      DELETE FROM chat_history;
      DELETE FROM database_connections;
      DELETE FROM sessions;
      DELETE FROM users;
    `);

    const insertUser = database.prepare(`
      INSERT INTO users (
        id,
        first_name,
        last_name,
        email,
        business_name,
        password_hash,
        legacy_password,
        avatar_url,
        auth_provider,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSession = database.prepare(`
      INSERT INTO sessions (
        token,
        user_id,
        created_at,
        expires_at,
        last_seen_at
      ) VALUES (?, ?, ?, ?, ?)
    `);
    const insertConnection = database.prepare(`
      INSERT INTO database_connections (
        user_id,
        payload_json,
        updated_at
      ) VALUES (?, ?, ?)
    `);
    const insertChatHistory = database.prepare(`
      INSERT INTO chat_history (
        id,
        user_id,
        message,
        reply,
        mode,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const user of data.users) {
      insertUser.run(
        user.id,
        user.firstName,
        user.lastName,
        user.email,
        user.businessName,
        user.passwordHash || null,
        user.password || null,
        user.avatarUrl || null,
        user.authProvider || "password",
        user.createdAt,
      );
    }

    for (const session of data.sessions) {
      insertSession.run(
        session.token,
        session.userId,
        session.createdAt,
        session.expiresAt || session.createdAt,
        session.lastSeenAt || session.createdAt,
      );
    }

    for (const connection of data.databaseConnections) {
      insertConnection.run(
        connection.userId,
        JSON.stringify(connection),
        connection.updatedAt || new Date().toISOString(),
      );
    }

    for (const entry of data.chatHistory) {
      insertChatHistory.run(
        entry.id,
        entry.userId,
        entry.message,
        entry.reply,
        entry.mode,
        entry.createdAt,
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function migrateLegacyDataIfNeeded(database) {
  if (getExistingUserCount(database) > 0) {
    return;
  }

  const legacyData = readLegacyJsonData();

  if (!legacyData) {
    return;
  }

  persistSnapshot(database, legacyData);
}

function mapUsers(database) {
  const rows = database.prepare(`
    SELECT
      id,
      first_name,
      last_name,
      email,
      business_name,
      password_hash,
      legacy_password,
      avatar_url,
      auth_provider,
      created_at
    FROM users
    ORDER BY created_at ASC
  `).all();

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    businessName: row.business_name,
    passwordHash: row.password_hash || undefined,
    password: row.legacy_password || undefined,
    avatarUrl: row.avatar_url || undefined,
    authProvider: row.auth_provider,
    createdAt: row.created_at,
  }));
}

function mapSessions(database) {
  const rows = database.prepare(`
    SELECT token, user_id, created_at, expires_at, last_seen_at
    FROM sessions
    ORDER BY created_at ASC
  `).all();

  return rows.map((row) => ({
    token: row.token,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
  }));
}

function mapConnections(database) {
  const rows = database.prepare(`
    SELECT payload_json
    FROM database_connections
    ORDER BY updated_at ASC
  `).all();

  return rows.map((row) => JSON.parse(row.payload_json));
}

function mapChatHistory(database) {
  const rows = database.prepare(`
    SELECT id, user_id, message, reply, mode, created_at
    FROM chat_history
    ORDER BY created_at ASC
  `).all();

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    message: row.message,
    reply: row.reply,
    mode: row.mode,
    createdAt: row.created_at,
  }));
}

export function readData() {
  const database = openDatabase();

  try {
    migrateLegacyDataIfNeeded(database);

    return {
      users: mapUsers(database),
      sessions: mapSessions(database),
      databaseConnections: mapConnections(database),
      chatHistory: mapChatHistory(database),
    };
  } finally {
    database.close();
  }
}

export function writeData(nextData) {
  const database = openDatabase();

  try {
    persistSnapshot(database, nextData);
  } finally {
    database.close();
  }
}
