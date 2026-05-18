import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Client: PostgresClient } = pg;

const defaultData = {
  users: [],
  sessions: [],
  databaseConnections: [],
  chatHistory: [],
  passwordResetTokens: [],
  emailVerificationTokens: [],
};

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function getConfiguredDataDirectory() {
  return process.env.APP_DATA_DIRECTORY
    ? path.resolve(process.env.APP_DATA_DIRECTORY)
    : null;
}

function getDataDirectory() {
  const configuredDataDirectory = getConfiguredDataDirectory();

  if (configuredDataDirectory) {
    return configuredDataDirectory;
  }

  return isVercelRuntime()
    ? path.join(os.tmpdir(), "orrico-data")
    : path.resolve("server", "data");
}

function getSqliteFilePath() {
  return path.join(getDataDirectory(), "app-data.sqlite");
}

function getLegacyJsonFilePath() {
  return path.join(getDataDirectory(), "app-data.json");
}

function ensureDataDirectory() {
  const dataDirectory = getDataDirectory();

  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || "";
}

function usePostgresStore() {
  return Boolean(getDatabaseUrl().trim());
}

export function getStoreMode() {
  return usePostgresStore() ? "postgresql" : "sqlite";
}

export function getStoreInfo() {
  return {
    mode: getStoreMode(),
    dataDirectory: getDataDirectory(),
    sqliteFilePath: getSqliteFilePath(),
  };
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
    passwordResetTokens: Array.isArray(data?.passwordResetTokens)
      ? data.passwordResetTokens
      : [],
    emailVerificationTokens: Array.isArray(data?.emailVerificationTokens)
      ? data.emailVerificationTokens
      : [],
  };
}

function readLegacyJsonData() {
  const legacyJsonFilePath = getLegacyJsonFilePath();

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

function openSqliteDatabase() {
  ensureDataDirectory();
  const database = new DatabaseSync(getSqliteFilePath());
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
      created_at TEXT NOT NULL,
      email_verified_at TEXT
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

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return database;
}

function mapSqliteUsers(database) {
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
      created_at,
      email_verified_at
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
    emailVerifiedAt: row.email_verified_at || undefined,
  }));
}

function mapSqliteSessions(database) {
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

function mapSqliteConnections(database) {
  const rows = database.prepare(`
    SELECT payload_json
    FROM database_connections
    ORDER BY updated_at ASC
  `).all();

  return rows.map((row) => JSON.parse(row.payload_json));
}

function mapSqliteChatHistory(database) {
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

function mapSqliteTokenRows(database, tableName) {
  const rows = database.prepare(`
    SELECT token, user_id, created_at, expires_at, consumed_at
    FROM ${tableName}
    ORDER BY created_at ASC
  `).all();

  return rows.map((row) => ({
    token: row.token,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at || undefined,
  }));
}

function getExistingSqliteUserCount(database) {
  const row = database
    .prepare(`SELECT COUNT(*) AS total FROM users`)
    .get();

  return Number(row?.total || 0);
}

function persistSqliteSnapshot(database, nextData) {
  const data = normalizeDataShape(nextData);

  database.exec("BEGIN");

  try {
    database.exec(`
      DELETE FROM email_verification_tokens;
      DELETE FROM password_reset_tokens;
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
        created_at,
        email_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    const insertPasswordResetToken = database.prepare(`
      INSERT INTO password_reset_tokens (
        token,
        user_id,
        created_at,
        expires_at,
        consumed_at
      ) VALUES (?, ?, ?, ?, ?)
    `);
    const insertEmailVerificationToken = database.prepare(`
      INSERT INTO email_verification_tokens (
        token,
        user_id,
        created_at,
        expires_at,
        consumed_at
      ) VALUES (?, ?, ?, ?, ?)
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
        user.emailVerifiedAt || null,
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

    for (const token of data.passwordResetTokens) {
      insertPasswordResetToken.run(
        token.token,
        token.userId,
        token.createdAt,
        token.expiresAt,
        token.consumedAt || null,
      );
    }

    for (const token of data.emailVerificationTokens) {
      insertEmailVerificationToken.run(
        token.token,
        token.userId,
        token.createdAt,
        token.expiresAt,
        token.consumedAt || null,
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function migrateLegacySqliteDataIfNeeded(database) {
  if (getExistingSqliteUserCount(database) > 0) {
    return;
  }

  const legacyData = readLegacyJsonData();

  if (!legacyData) {
    return;
  }

  persistSqliteSnapshot(database, legacyData);
}

function readSqliteData() {
  const database = openSqliteDatabase();

  try {
    migrateLegacySqliteDataIfNeeded(database);

    return {
      users: mapSqliteUsers(database),
      sessions: mapSqliteSessions(database),
      databaseConnections: mapSqliteConnections(database),
      chatHistory: mapSqliteChatHistory(database),
      passwordResetTokens: mapSqliteTokenRows(
        database,
        "password_reset_tokens",
      ),
      emailVerificationTokens: mapSqliteTokenRows(
        database,
        "email_verification_tokens",
      ),
    };
  } finally {
    database.close();
  }
}

async function openPostgresClient() {
  const client = new PostgresClient({
    connectionString: getDatabaseUrl(),
    ssl: process.env.PGSSL === "disable"
      ? undefined
      : { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

async function initializePostgres(client) {
  await client.query(`
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
      created_at TEXT NOT NULL,
      email_verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS database_connections (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload_json JSONB NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      reply TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
  `);
}

async function getExistingPostgresUserCount(client) {
  const result = await client.query(`
    SELECT COUNT(*)::int AS total
    FROM users
  `);

  return Number(result.rows[0]?.total || 0);
}

async function persistPostgresSnapshot(client, nextData) {
  const data = normalizeDataShape(nextData);

  await client.query("BEGIN");

  try {
    await client.query(`
      DELETE FROM email_verification_tokens;
      DELETE FROM password_reset_tokens;
      DELETE FROM chat_history;
      DELETE FROM database_connections;
      DELETE FROM sessions;
      DELETE FROM users;
    `);

    for (const user of data.users) {
      await client.query(
        `
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
            created_at,
            email_verified_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,
        [
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
          user.emailVerifiedAt || null,
        ],
      );
    }

    for (const session of data.sessions) {
      await client.query(
        `
          INSERT INTO sessions (
            token,
            user_id,
            created_at,
            expires_at,
            last_seen_at
          ) VALUES ($1,$2,$3,$4,$5)
        `,
        [
          session.token,
          session.userId,
          session.createdAt,
          session.expiresAt || session.createdAt,
          session.lastSeenAt || session.createdAt,
        ],
      );
    }

    for (const connection of data.databaseConnections) {
      await client.query(
        `
          INSERT INTO database_connections (
            user_id,
            payload_json,
            updated_at
          ) VALUES ($1,$2::jsonb,$3)
        `,
        [
          connection.userId,
          JSON.stringify(connection),
          connection.updatedAt || new Date().toISOString(),
        ],
      );
    }

    for (const entry of data.chatHistory) {
      await client.query(
        `
          INSERT INTO chat_history (
            id,
            user_id,
            message,
            reply,
            mode,
            created_at
          ) VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          entry.id,
          entry.userId,
          entry.message,
          entry.reply,
          entry.mode,
          entry.createdAt,
        ],
      );
    }

    for (const token of data.passwordResetTokens) {
      await client.query(
        `
          INSERT INTO password_reset_tokens (
            token,
            user_id,
            created_at,
            expires_at,
            consumed_at
          ) VALUES ($1,$2,$3,$4,$5)
        `,
        [
          token.token,
          token.userId,
          token.createdAt,
          token.expiresAt,
          token.consumedAt || null,
        ],
      );
    }

    for (const token of data.emailVerificationTokens) {
      await client.query(
        `
          INSERT INTO email_verification_tokens (
            token,
            user_id,
            created_at,
            expires_at,
            consumed_at
          ) VALUES ($1,$2,$3,$4,$5)
        `,
        [
          token.token,
          token.userId,
          token.createdAt,
          token.expiresAt,
          token.consumedAt || null,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function migratePostgresIfNeeded(client) {
  const currentUserCount = await getExistingPostgresUserCount(client);

  if (currentUserCount > 0) {
    return;
  }

  const sqliteFilePath = getSqliteFilePath();
  const snapshot = fs.existsSync(sqliteFilePath)
    ? readSqliteData()
    : readLegacyJsonData();

  if (!snapshot) {
    return;
  }

  await persistPostgresSnapshot(client, snapshot);
}

async function readPostgresData() {
  const client = await openPostgresClient();

  try {
    await initializePostgres(client);
    await migratePostgresIfNeeded(client);

    const [
      usersResult,
      sessionsResult,
      connectionsResult,
      chatHistoryResult,
      passwordResetTokensResult,
      emailVerificationTokensResult,
    ] = await Promise.all([
      client.query(`
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
          created_at,
          email_verified_at
        FROM users
        ORDER BY created_at ASC
      `),
      client.query(`
        SELECT token, user_id, created_at, expires_at, last_seen_at
        FROM sessions
        ORDER BY created_at ASC
      `),
      client.query(`
        SELECT payload_json
        FROM database_connections
        ORDER BY updated_at ASC
      `),
      client.query(`
        SELECT id, user_id, message, reply, mode, created_at
        FROM chat_history
        ORDER BY created_at ASC
      `),
      client.query(`
        SELECT token, user_id, created_at, expires_at, consumed_at
        FROM password_reset_tokens
        ORDER BY created_at ASC
      `),
      client.query(`
        SELECT token, user_id, created_at, expires_at, consumed_at
        FROM email_verification_tokens
        ORDER BY created_at ASC
      `),
    ]);

    return {
      users: usersResult.rows.map((row) => ({
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
        emailVerifiedAt: row.email_verified_at || undefined,
      })),
      sessions: sessionsResult.rows.map((row) => ({
        token: row.token,
        userId: row.user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastSeenAt: row.last_seen_at,
      })),
      databaseConnections: connectionsResult.rows.map(
        (row) => row.payload_json,
      ),
      chatHistory: chatHistoryResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        message: row.message,
        reply: row.reply,
        mode: row.mode,
        createdAt: row.created_at,
      })),
      passwordResetTokens: passwordResetTokensResult.rows.map((row) => ({
        token: row.token,
        userId: row.user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        consumedAt: row.consumed_at || undefined,
      })),
      emailVerificationTokens:
        emailVerificationTokensResult.rows.map((row) => ({
          token: row.token,
          userId: row.user_id,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          consumedAt: row.consumed_at || undefined,
        })),
    };
  } finally {
    await client.end();
  }
}

async function writePostgresData(nextData) {
  const client = await openPostgresClient();

  try {
    await initializePostgres(client);
    await persistPostgresSnapshot(client, nextData);
  } finally {
    await client.end();
  }
}

export async function readData() {
  if (usePostgresStore()) {
    return readPostgresData();
  }

  return readSqliteData();
}

export async function writeData(nextData) {
  if (usePostgresStore()) {
    await writePostgresData(nextData);
    return;
  }

  const database = openSqliteDatabase();

  try {
    persistSqliteSnapshot(database, nextData);
  } finally {
    database.close();
  }
}

export async function checkStoreHealth() {
  if (usePostgresStore()) {
    const client = await openPostgresClient();

    try {
      await initializePostgres(client);
      await client.query("SELECT 1");
      return {
        ok: true,
        mode: "postgresql",
      };
    } finally {
      await client.end();
    }
  }

  const database = openSqliteDatabase();

  try {
    database.prepare("SELECT 1").get();
    return {
      ok: true,
      mode: "sqlite",
      filePath: getSqliteFilePath(),
    };
  } finally {
    database.close();
  }
}
