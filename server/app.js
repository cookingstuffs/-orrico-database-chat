import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  hashPassword,
  isPasswordHash,
  isSessionExpired,
  isTimedTokenExpired,
  touchSession,
  verifyPassword,
} from "./auth.js";
import { buildChatReply } from "./chat-engine.js";
import {
  createRetailOrder,
  createRetailProduct,
  deleteRetailCustomer,
  deleteRetailProduct,
  getSchemaOverview,
  importCsvDataset,
  openRetailDatabase,
  updateRetailCustomer,
  updateRetailProductStock,
  updateRetailProduct,
} from "./demo-retail-db.js";
import {
  getRelationalSchemaOverview,
  testRelationalConnection,
} from "./live-relational-db.js";
import {
  getDashboardCustomers,
  getDashboardDetails,
  getDashboardOrders,
  getDashboardSummary,
} from "./dashboard-service.js";
import {
  checkStoreHealth,
  getStoreInfo,
  getStoreMode,
  readData,
  writeData,
} from "./data-store.js";
import {
  errorHandler,
  requestContextMiddleware,
  requestLoggerMiddleware,
} from "./logger.js";
import {
  getCorsOrigins,
  getRuntimeSummary,
} from "./runtime.js";
import {
  decryptSecret,
  encryptSecret,
} from "./secrets.js";
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
  getAppBaseUrl,
  isEmailAuthOptional,
  sendTransactionalEmail,
} from "./email-service.js";

export const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(requestContextMiddleware);
app.use(requestLoggerMiddleware);

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
    emailVerifiedAt: user.emailVerifiedAt || null,
    emailVerified: Boolean(user.emailVerifiedAt),
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

async function pruneExpiredSessions(data) {
  const sessionsChanged =
    data.sessions.some((entry) => isSessionExpired(entry));
  const passwordResetTokensChanged =
    data.passwordResetTokens.some(
      (entry) =>
        isTimedTokenExpired(entry) || entry.consumedAt,
    );
  const emailVerificationTokensChanged =
    data.emailVerificationTokens.some(
      (entry) =>
        isTimedTokenExpired(entry) || entry.consumedAt,
    );
  const nextSessions = data.sessions.filter(
    (entry) => !isSessionExpired(entry),
  );
  const nextPasswordResetTokens = data.passwordResetTokens.filter(
    (entry) =>
      !isTimedTokenExpired(entry) && !entry.consumedAt,
  );
  const nextEmailVerificationTokens =
    data.emailVerificationTokens.filter(
      (entry) =>
        !isTimedTokenExpired(entry) && !entry.consumedAt,
    );

  if (sessionsChanged) {
    data.sessions = nextSessions;
  }

  if (passwordResetTokensChanged) {
    data.passwordResetTokens = nextPasswordResetTokens;
  }

  if (emailVerificationTokensChanged) {
    data.emailVerificationTokens =
      nextEmailVerificationTokens;
  }

  if (
    sessionsChanged ||
    passwordResetTokensChanged ||
    emailVerificationTokensChanged
  ) {
    await writeData(data);
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

async function getSessionFromRequest(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  const data = await readData();
  await pruneExpiredSessions(data);
  const session = data.sessions.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  const user = data.users.find((entry) => entry.id === session.userId);

  if (!user) {
    return null;
  }

  touchSession(session);
  await writeData(data);

  return { data, token, session, user };
}

function findUserByEmail(data, email) {
  return data.users.find(
    (entry) => entry.email.toLowerCase() === normalizeEmail(email),
  );
}

function getLatestVerificationTokenForUser(data, userId) {
  return [...data.emailVerificationTokens]
    .filter(
      (entry) =>
        entry.userId === userId &&
        !entry.consumedAt &&
        !isTimedTokenExpired(entry),
    )
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) -
        Date.parse(left.createdAt),
    )[0];
}

async function deliverVerificationEmail(user, token) {
  return sendTransactionalEmail(
    buildVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      token,
      appBaseUrl: getAppBaseUrl(),
    }),
  );
}

async function deliverPasswordResetEmail(user, token) {
  return sendTransactionalEmail(
    buildPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      token,
      appBaseUrl: getAppBaseUrl(),
    }),
  );
}

app.get("/api/health", async (_request, response) => {
  const storeHealth = await checkStoreHealth();
  const storeInfo = getStoreInfo();
  const runtime = getRuntimeSummary({
    storeMode: getStoreMode(),
    storeHealth,
  });

  response.json({
    status: storeHealth.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    store: {
      ...storeInfo,
      ...storeHealth,
    },
    runtime,
  });
});

app.get("/api/health/ready", async (_request, response) => {
  try {
    const storeHealth = await checkStoreHealth();
    const runtime = getRuntimeSummary({
      storeMode: getStoreMode(),
      storeHealth,
    });
    const ready =
      storeHealth.ok && runtime.missingProductionEnvVars.length === 0;

    response.status(ready ? 200 : 503).json({
      ready,
      timestamp: new Date().toISOString(),
      runtime,
    });
  } catch (error) {
    response.status(503).json({
      ready: false,
      error:
        error instanceof Error
          ? error.message
          : "Readiness check failed.",
    });
  }
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

  const data = await readData();
  const existingUser = findUserByEmail(data, normalizedEmail);

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
    emailVerifiedAt: isEmailAuthOptional()
      ? new Date().toISOString()
      : null,
  };
  const requiresEmailVerification = !user.emailVerifiedAt;

  data.users.push(user);
  let verificationToken = null;
  let emailResult = {
    delivered: false,
    skipped: true,
    reason: "Email verification is currently optional.",
  };

  if (requiresEmailVerification) {
    verificationToken = createEmailVerificationToken(user.id);
    data.emailVerificationTokens.push(verificationToken);
  }

  let session = null;
  if (!requiresEmailVerification) {
    session = createSession(user.id);
    data.sessions.push(session);
  }

  await writeData(data);

  if (verificationToken) {
    emailResult = await deliverVerificationEmail(
      user,
      verificationToken.token,
    );
  }
  clearFailedAuthAttempts(rateLimit.key);

  response.status(201).json({
    token: session?.token,
    user: sanitizeUser(user),
    requiresEmailVerification,
    emailDelivery: emailResult,
    verificationToken:
      !verificationToken || process.env.NODE_ENV === "production"
        ? undefined
        : verificationToken.token,
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

  const data = await readData();
  await pruneExpiredSessions(data);

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

  if (
    user.authProvider === "password" &&
    !user.emailVerifiedAt
  ) {
    if (isEmailAuthOptional()) {
      user.emailVerifiedAt = new Date().toISOString();
      const session = createSession(user.id);
      data.sessions.push(session);
      await writeData(data);
      clearFailedAuthAttempts(rateLimit.key);

      response.json({
        token: session.token,
        user: sanitizeUser(user),
      });
      return;
    }

    const verificationToken =
      getLatestVerificationTokenForUser(data, user.id) ||
      createEmailVerificationToken(user.id);

    if (
      !data.emailVerificationTokens.find(
        (entry) => entry.token === verificationToken.token,
      )
    ) {
      data.emailVerificationTokens.push(verificationToken);
    }

    await writeData(data);
    const emailResult = await deliverVerificationEmail(
      user,
      verificationToken.token,
    );
    response.status(403).json({
      error: "Please verify your email before signing in.",
      requiresEmailVerification: true,
      email: user.email,
      emailDelivery: emailResult,
      verificationToken:
        process.env.NODE_ENV === "production"
          ? undefined
          : verificationToken.token,
    });
    return;
  }

  const session = createSession(user.id);
  data.sessions.push(session);
  await writeData(data);
  clearFailedAuthAttempts(rateLimit.key);

  response.json({
    token: session.token,
    user: sanitizeUser(user),
  });
});

app.post("/api/auth/verify-email/request", async (request, response) => {
  if (isEmailAuthOptional()) {
    response.json({
      ok: true,
      message:
        "Email verification is currently optional for this deployment.",
    });
    return;
  }

  const normalizedEmail = normalizeEmail(request.body?.email);

  if (!normalizedEmail) {
    response.status(400).json({ error: "Email is required." });
    return;
  }

  const data = await readData();
  const user = findUserByEmail(data, normalizedEmail);

  if (!user) {
    response.json({
      ok: true,
      message:
        "If an account exists for that email, a verification link has been prepared.",
    });
    return;
  }

  if (user.emailVerifiedAt) {
    response.json({
      ok: true,
      message: "This email address is already verified.",
    });
    return;
  }

  data.emailVerificationTokens =
    data.emailVerificationTokens.filter(
      (entry) => entry.userId !== user.id,
    );

  const verificationToken = createEmailVerificationToken(
    user.id,
  );
  data.emailVerificationTokens.push(verificationToken);
  await writeData(data);
  const emailResult = await deliverVerificationEmail(
    user,
    verificationToken.token,
  );

  response.json({
    ok: true,
    message:
      "Verification instructions have been prepared for this email address.",
    emailDelivery: emailResult,
    verificationToken:
      process.env.NODE_ENV === "production"
        ? undefined
        : verificationToken.token,
  });
});

app.post("/api/auth/verify-email/confirm", async (request, response) => {
  if (isEmailAuthOptional()) {
    response.status(400).json({
      error: "Email verification is currently disabled for this deployment.",
    });
    return;
  }

  const normalizedEmail = normalizeEmail(request.body?.email);
  const token = String(request.body?.token || "").trim();

  if (!normalizedEmail || !token) {
    response
      .status(400)
      .json({ error: "Email and verification token are required." });
    return;
  }

  const data = await readData();
  const user = findUserByEmail(data, normalizedEmail);

  if (!user) {
    response.status(404).json({ error: "Account not found." });
    return;
  }

  const verificationToken = data.emailVerificationTokens.find(
    (entry) =>
      entry.token === token && entry.userId === user.id,
  );

  if (!verificationToken || isTimedTokenExpired(verificationToken)) {
    response.status(400).json({
      error: "Verification token is invalid or expired.",
    });
    return;
  }

  verificationToken.consumedAt = new Date().toISOString();
  user.emailVerifiedAt = new Date().toISOString();
  data.emailVerificationTokens =
    data.emailVerificationTokens.filter(
      (entry) => entry.userId !== user.id,
    );
  const session = createSession(user.id);
  data.sessions.push(session);
  await writeData(data);

  response.json({
    token: session.token,
    user: sanitizeUser(user),
  });
});

app.post("/api/auth/password-reset/request", async (request, response) => {
  if (isEmailAuthOptional()) {
    response.status(400).json({
      error: "Password reset by email is currently unavailable.",
    });
    return;
  }

  const normalizedEmail = normalizeEmail(request.body?.email);

  if (!normalizedEmail) {
    response.status(400).json({ error: "Email is required." });
    return;
  }

  const data = await readData();
  const user = findUserByEmail(data, normalizedEmail);

  if (!user) {
    response.json({
      ok: true,
      message:
        "If an account exists for that email, reset instructions have been prepared.",
    });
    return;
  }

  data.passwordResetTokens = data.passwordResetTokens.filter(
    (entry) => entry.userId !== user.id,
  );
  const resetToken = createPasswordResetToken(user.id);
  data.passwordResetTokens.push(resetToken);
  await writeData(data);
  const emailResult = await deliverPasswordResetEmail(
    user,
    resetToken.token,
  );

  response.json({
    ok: true,
    message:
      "Reset instructions have been prepared for this email address.",
    emailDelivery: emailResult,
    resetToken:
      process.env.NODE_ENV === "production"
        ? undefined
        : resetToken.token,
  });
});

app.post("/api/auth/password-reset/confirm", async (request, response) => {
  const normalizedEmail = normalizeEmail(request.body?.email);
  const token = String(request.body?.token || "").trim();
  const password = String(request.body?.password || "");

  if (!normalizedEmail || !token || !password) {
    response.status(400).json({
      error: "Email, reset token, and new password are required.",
    });
    return;
  }

  if (password.length < 8) {
    response.status(400).json({
      error: "Password must be at least 8 characters.",
    });
    return;
  }

  const data = await readData();
  const user = findUserByEmail(data, normalizedEmail);

  if (!user) {
    response.status(404).json({ error: "Account not found." });
    return;
  }

  const resetToken = data.passwordResetTokens.find(
    (entry) =>
      entry.token === token && entry.userId === user.id,
  );

  if (!resetToken || isTimedTokenExpired(resetToken)) {
    response.status(400).json({
      error: "Reset token is invalid or expired.",
    });
    return;
  }

  resetToken.consumedAt = new Date().toISOString();
  user.passwordHash = await hashPassword(password);
  delete user.password;
  data.passwordResetTokens = data.passwordResetTokens.filter(
    (entry) => entry.userId !== user.id,
  );
  data.sessions = data.sessions.filter(
    (entry) => entry.userId !== user.id,
  );
  await writeData(data);

  response.json({
    ok: true,
    message: "Password updated successfully. Sign in again.",
  });
});

app.get("/api/auth/session", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Session not found." });
    return;
  }

  response.json({
    user: sanitizeUser(session.user),
  });
});

app.post("/api/auth/logout", async (request, response) => {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    response.status(204).end();
    return;
  }

  const data = await readData();
  data.sessions = data.sessions.filter((entry) => entry.token !== token);
  await writeData(data);
  response.status(204).end();
});

app.get("/api/database/current", async (request, response) => {
  const session = await getSessionFromRequest(request);

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
  const session = await getSessionFromRequest(request);

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
  const session = await getSessionFromRequest(request);

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
  const session = await getSessionFromRequest(request);

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
  await writeData(session.data);

  response.json({ connection: sanitizeConnection(nextConnection) });
});

app.post("/api/database/import-csv", async (request, response) => {
  const session = await getSessionFromRequest(request);

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

app.get("/api/dashboard/summary", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const summary = await getDashboardSummary(
      prepareConnectionForUse(connection),
    );
    response.json(summary);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Dashboard summary could not be loaded.",
    });
  }
});

app.get("/api/dashboard/details", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const details = await getDashboardDetails(
      prepareConnectionForUse(connection),
    );
    response.json(details);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Dashboard details could not be loaded.",
    });
  }
});

app.get("/api/dashboard/orders", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const orders = await getDashboardOrders(
      prepareConnectionForUse(connection),
      request.query.limit,
    );
    response.json(orders);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Dashboard orders could not be loaded.",
    });
  }
});

app.get("/api/dashboard/customers", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const customers = await getDashboardCustomers(
      prepareConnectionForUse(connection),
    );
    response.json(customers);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Dashboard customers could not be loaded.",
    });
  }
});

app.post("/api/dashboard/products", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const product = createRetailProduct(
      prepareConnectionForUse(connection),
      request.body || {},
    );
    response.status(201).json({ product });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Product could not be created.",
    });
  }
});

app.patch("/api/dashboard/products/:productId", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const product = updateRetailProduct(
      prepareConnectionForUse(connection),
      {
        productId: request.params.productId,
        ...request.body,
      },
    );
    response.json({ product });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Product could not be updated.",
    });
  }
});

app.patch("/api/dashboard/products/:productId/stock", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const product = updateRetailProductStock(
      prepareConnectionForUse(connection),
      {
        productId: request.params.productId,
        stock: request.body?.stock,
      },
    );
    response.json({ product });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Product stock could not be updated.",
    });
  }
});

app.delete("/api/dashboard/products/:productId", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const product = deleteRetailProduct(
      prepareConnectionForUse(connection),
      {
        productId: request.params.productId,
      },
    );
    response.json({ product });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Product could not be deleted.",
    });
  }
});

app.patch("/api/dashboard/customers/:customerId", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const customer = updateRetailCustomer(
      prepareConnectionForUse(connection),
      {
        customerId: request.params.customerId,
        ...request.body,
      },
    );
    response.json({ customer });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Customer could not be updated.",
    });
  }
});

app.delete("/api/dashboard/customers/:customerId", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const customer = deleteRetailCustomer(
      prepareConnectionForUse(connection),
      {
        customerId: request.params.customerId,
      },
    );
    response.json({ customer });
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Customer could not be deleted.",
    });
  }
});

app.post("/api/dashboard/orders", async (request, response) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const connection =
    session.data.databaseConnections.find(
      (entry) => entry.userId === session.user.id,
    ) || null;

  try {
    const result = createRetailOrder(
      prepareConnectionForUse(connection),
      request.body || {},
    );
    response.status(201).json(result);
  } catch (error) {
    response.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Order could not be created.",
    });
  }
});

app.get("/api/chat/history", async (request, response) => {
  const session = await getSessionFromRequest(request);

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
  const session = await getSessionFromRequest(request);

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
  await writeData(session.data);

  response.json(result);
});

app.use(errorHandler);
