import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import {
  createSession,
  hashPassword,
  isPasswordHash,
  isSessionExpired,
  touchSession,
  verifyPassword,
} from "./auth.js";
import { buildChatReply } from "./chat-engine.js";
import {
  getSchemaOverview,
  openRetailDatabase,
  importCsvDataset,
} from "./demo-retail-db.js";
import {
  getRelationalSchemaOverview,
  testRelationalConnection,
} from "./live-relational-db.js";
import { readData, writeData } from "./data-store.js";
import {
  decryptSecret,
  encryptSecret,
} from "./secrets.js";

export const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

const authAttemptStore = new Map();
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 8;

function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    businessName: user.businessName,
    avatarUrl: user.avatarUrl || null,
    authProvider: user.authProvider || "password",
    createdAt: user.createdAt,
  };
}

function normalizeConnectionPayload(payload) {
  return {
    databaseType: String(payload.databaseType || "").trim().toLowerCase(),
    host: String(payload.host || "").trim(),
    port: String(payload.port || "").trim(),
    databaseName: String(payload.databaseName || "").trim(),
    username: String(payload.username || "").trim(),
    password: String(payload.password || "").trim(),
    filePath: String(payload.filePath || "").trim(),
    isDemoConnection: Boolean(payload.isDemoConnection),
    connectedAt: payload.connectedAt || new Date().toISOString(),
  };
}

function sanitizeConnection(connection) {
  if (!connection) {
    return null;
  }

  const { password, ...safeConnection } = connection;

  return {
    ...safeConnection,
    hasPassword: Boolean(password),
  };
}

function prepareConnectionForStorage(connection) {
  return {
    ...connection,
    password: connection.password
      ? encryptSecret(connection.password)
      : "",
  };
}

function prepareConnectionForUse(connection) {
  if (!connection) {
    return null;
  }

  return {
    ...connection,
    password: connection.password
      ? decryptSecret(connection.password)
      : "",
  };
}

function validateConnectionPayload(payload) {
  if (!payload.databaseType) {
    return "Database type is required.";
  }

  if (
    !["sqlite", "postgresql", "mysql", "oracle"].includes(
      payload.databaseType,
    )
  ) {
    return "Unsupported database type.";
  }

  if (payload.databaseType === "oracle") {
    return "Oracle connector is not implemented yet.";
  }

  if (payload.databaseType === "sqlite") {
    return null;
  }

  if (
    !payload.host ||
    !payload.port ||
    !payload.databaseName ||
    !payload.username ||
    !payload.password
  ) {
    return "Host, port, database name, username, and password are required.";
  }

  return null;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pruneExpiredSessions(data) {
  const nextSessions = data.sessions.filter(
    (entry) => !isSessionExpired(entry),
  );

  if (nextSessions.length !== data.sessions.length) {
    data.sessions = nextSessions;
    writeData(data);
  }
}

function getRateLimitKey(request, email) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || request.ip || "unknown");

  return `${ipAddress}:${normalizeEmail(email)}`;
}

function assertAuthRateLimit(request, response, email) {
  const key = getRateLimitKey(request, email);
  const now = Date.now();
  const currentWindow =
    authAttemptStore.get(key) || { count: 0, firstAttemptAt: now };

  if (now - currentWindow.firstAttemptAt > AUTH_ATTEMPT_WINDOW_MS) {
    authAttemptStore.set(key, {
      count: 0,
      firstAttemptAt: now,
    });
    return { key, blocked: false };
  }

  if (currentWindow.count >= AUTH_MAX_ATTEMPTS) {
    response.status(429).json({
      error: "Too many login attempts. Try again in a few minutes.",
    });
    return { key, blocked: true };
  }

  return { key, blocked: false };
}

function recordFailedAuthAttempt(key) {
  const now = Date.now();
  const currentWindow =
    authAttemptStore.get(key) || { count: 0, firstAttemptAt: now };

  if (now - currentWindow.firstAttemptAt > AUTH_ATTEMPT_WINDOW_MS) {
    authAttemptStore.set(key, {
      count: 1,
      firstAttemptAt: now,
    });
    return;
  }

  authAttemptStore.set(key, {
    count: currentWindow.count + 1,
    firstAttemptAt: currentWindow.firstAttemptAt,
  });
}

function clearFailedAuthAttempts(key) {
  authAttemptStore.delete(key);
}

function getSessionFromRequest(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  const data = readData();
  pruneExpiredSessions(data);
  const session = data.sessions.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  const user = data.users.find((entry) => entry.id === session.userId);

  if (!user) {
    return null;
  }

  touchSession(session);
  writeData(data);

  return { data, token, session, user };
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/auth/signup", async (request, response) => {
  const {
    firstName,
    lastName,
    email,
    businessName,
    password,
  } = request.body || {};

  if (!firstName || !lastName || !email || !businessName || !password) {
    response.status(400).json({ error: "Missing required fields." });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const rateLimit = assertAuthRateLimit(
    request,
    response,
    normalizedEmail,
  );

  if (rateLimit.blocked) {
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    recordFailedAuthAttempt(rateLimit.key);
    response.status(400).json({ error: "Invalid email address." });
    return;
  }

  if (String(password).length < 8) {
    recordFailedAuthAttempt(rateLimit.key);
    response
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
    return;
  }

  const data = readData();
  const existingUser = data.users.find(
    (user) => user.email.toLowerCase() === normalizedEmail,
  );

  if (existingUser) {
    recordFailedAuthAttempt(rateLimit.key);
    response.status(409).json({ error: "Email already registered." });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    businessName: String(businessName).trim(),
    passwordHash: await hashPassword(String(password)),
    authProvider: "password",
    createdAt: new Date().toISOString(),
  };
  const session = createSession(user.id);

  data.users.push(user);
  data.sessions.push(session);
  writeData(data);
  clearFailedAuthAttempts(rateLimit.key);

  response.status(201).json({
    token: session.token,
    user: sanitizeUser(user),
  });
});

app.post("/api/auth/login", async (request, response) => {
  const { email, password } = request.body || {};
  const normalizedEmail = normalizeEmail(email);
  const rateLimit = assertAuthRateLimit(
    request,
    response,
    normalizedEmail,
  );

  if (rateLimit.blocked) {
    return;
  }

  if (!normalizedEmail || !password) {
    recordFailedAuthAttempt(rateLimit.key);
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  const data = readData();
  pruneExpiredSessions(data);

  let user = data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail,
  );

  if (user?.authProvider === "password") {
    const submittedPassword = String(password);
    const legacyPassword = user.password;
    let isAuthenticated = false;

    if (isPasswordHash(user.passwordHash)) {
      isAuthenticated = await verifyPassword(
        submittedPassword,
        user.passwordHash,
      );
    } else if (
      typeof legacyPassword === "string" &&
      legacyPassword === submittedPassword
    ) {
      user.passwordHash = await hashPassword(submittedPassword);
      delete user.password;
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      user = null;
    }
  }

  if (!user && normalizedEmail === "demo@orrico.com" && password === "demo123") {
    user = {
      id: "demo-user",
      firstName: "Demo",
      lastName: "User",
      email: normalizedEmail,
      businessName: "Demo Retail Store",
      authProvider: "demo",
      createdAt: new Date().toISOString(),
    };

    if (!data.users.find((entry) => entry.id === user.id)) {
      data.users.push(user);
    }
  }

  if (!user) {
    recordFailedAuthAttempt(rateLimit.key);
    response.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const session = createSession(user.id);
  data.sessions.push(session);
  writeData(data);
  clearFailedAuthAttempts(rateLimit.key);

  response.json({
    token: session.token,
    user: sanitizeUser(user),
  });
});

app.get("/api/auth/session", (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Session not found." });
    return;
  }

  response.json({
    user: sanitizeUser(session.user),
  });
});

app.post("/api/auth/logout", (request, response) => {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    response.status(204).end();
    return;
  }

  const data = readData();
  data.sessions = data.sessions.filter((entry) => entry.token !== token);
  writeData(data);
  response.status(204).end();
});

app.get("/api/database/current", (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection = session.data.databaseConnections.find(
    (entry) => entry.userId === session.user.id,
  );

  response.json({
    connection: sanitizeConnection(connection || null),
  });
});

app.get("/api/database/schema", async (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    if (
      connection &&
      ["postgresql", "mysql"].includes(connection.databaseType)
    ) {
      const overview =
        await getRelationalSchemaOverview(
          prepareConnectionForUse(connection),
        );
      response.json(overview);
      return;
    }

    const overview = getSchemaOverview(
      prepareConnectionForUse(connection),
    );
    response.json(overview);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Schema inspection failed.",
    });
  }
});

app.post("/api/database/test", async (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const payload = normalizeConnectionPayload(request.body || {});
  const validationError = validateConnectionPayload(payload);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  try {
    if (
      ["postgresql", "mysql"].includes(payload.databaseType)
    ) {
      const result = await testRelationalConnection(payload);
      response.json({
        ok: result.ok,
        databasePath: `${payload.host}:${payload.port}/${payload.databaseName}`,
        tableCount: result.tableCount,
      });
      return;
    }

    const { database, databasePath } = openRetailDatabase(payload);
    try {
      const tableCountRow = database
        .prepare(`
          SELECT COUNT(*) AS total
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
        `)
        .get();

      response.json({
        ok: true,
        databasePath,
        tableCount: Number(tableCountRow?.total || 0),
      });
    } finally {
      database.close();
    }
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Database connection test failed.",
    });
  }
});

app.post("/api/database/connect", async (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const payload = normalizeConnectionPayload(request.body || {});
  const validationError = validateConnectionPayload(payload);

  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  try {
    if (
      ["postgresql", "mysql"].includes(payload.databaseType)
    ) {
        await testRelationalConnection(payload);
      } else {
        const { database } = openRetailDatabase(payload);
        database.close();
    }
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to verify the database connection.",
    });
    return;
  }

  const nextConnection = {
    userId: session.user.id,
    ...prepareConnectionForStorage(payload),
    updatedAt: new Date().toISOString(),
  };

  session.data.databaseConnections =
    session.data.databaseConnections.filter(
      (entry) => entry.userId !== session.user.id,
    );
  session.data.databaseConnections.push(nextConnection);
  writeData(session.data);

  response.json({ connection: sanitizeConnection(nextConnection) });
});

app.post("/api/database/import-csv", (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  if (
    connection &&
    connection.databaseType &&
    connection.databaseType !== "sqlite" &&
    !connection.isDemoConnection
  ) {
    response.status(400).json({
      error:
        "CSV import is currently available for the demo SQLite database and SQLite file connections.",
    });
    return;
  }

  const { csvContent, tableName, fileName } = request.body || {};

  if (!csvContent || !String(csvContent).trim()) {
    response.status(400).json({ error: "CSV content is required." });
    return;
  }

  try {
    const result = importCsvDataset(connection, {
      csvContent: String(csvContent),
      tableName: String(tableName || ""),
      fileName: String(fileName || ""),
    });

    response.status(201).json(result);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "CSV import failed.",
    });
  }
});

app.get("/api/chat/history", (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const messages = session.data.chatHistory
    .filter((entry) => entry.userId === session.user.id)
    .sort((left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt),
    );

  response.json({ messages });
});

app.post("/api/chat/message", async (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const { message } = request.body || {};

  if (!message || !String(message).trim()) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;
  let result;

  try {
    result = await buildChatReply(String(message), {
      connection: prepareConnectionForUse(connection),
    });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Chat query failed.",
    });
    return;
  }

  session.data.chatHistory.push({
    id: crypto.randomUUID(),
    userId: session.user.id,
    message: String(message).trim(),
    reply: result.reply,
    mode: result.mode,
    createdAt: new Date().toISOString(),
  });
  writeData(session.data);

  response.json(result);
});
