import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import { buildChatReply } from "./chat-engine.js";
import { readData, writeData } from "./data-store.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

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

function getSessionFromRequest(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  const data = readData();
  const session = data.sessions.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  const user = data.users.find((entry) => entry.id === session.userId);

  if (!user) {
    return null;
  }

  return { data, token, session, user };
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/auth/signup", (request, response) => {
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

  const data = readData();
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = data.users.find(
    (user) => user.email.toLowerCase() === normalizedEmail,
  );

  if (existingUser) {
    response.status(409).json({ error: "Email already registered." });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    businessName: String(businessName).trim(),
    password: String(password),
    authProvider: "password",
    createdAt: new Date().toISOString(),
  };
  const token = createToken();

  data.users.push(user);
  data.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
  writeData(data);

  response.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

app.post("/api/auth/login", (request, response) => {
  const { email, password } = request.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  const data = readData();

  let user = data.users.find(
    (entry) =>
      entry.email.toLowerCase() === normalizedEmail &&
      entry.password === password,
  );

  if (!user && normalizedEmail === "demo@orrico.com" && password === "demo123") {
    user = {
      id: "demo-user",
      firstName: "Demo",
      lastName: "User",
      email: normalizedEmail,
      businessName: "Demo Retail Store",
      password: "demo123",
      authProvider: "demo",
      createdAt: new Date().toISOString(),
    };

    if (!data.users.find((entry) => entry.id === user.id)) {
      data.users.push(user);
    }
  }

  if (!user) {
    response.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = createToken();
  data.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
  writeData(data);

  response.json({
    token,
    user: sanitizeUser(user),
  });
});

app.post("/api/auth/google", (request, response) => {
  const {
    googleId,
    email,
    firstName,
    lastName,
    avatarUrl,
  } = request.body || {};

  if (!googleId || !email) {
    response.status(400).json({ error: "Google account details are incomplete." });
    return;
  }

  const data = readData();
  const normalizedEmail = String(email).trim().toLowerCase();
  let user = data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail,
  );

  if (!user) {
    user = {
      id: `google-${googleId}`,
      firstName: firstName || "Google",
      lastName: lastName || "User",
      email: normalizedEmail,
      businessName: "Google Account",
      avatarUrl: avatarUrl || null,
      authProvider: "google",
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
  } else {
    user.avatarUrl = avatarUrl || user.avatarUrl || null;
  }

  const token = createToken();
  data.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
  writeData(data);

  response.json({
    token,
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

  response.json({ connection: connection || null });
});

app.post("/api/database/connect", (request, response) => {
  const session = getSessionFromRequest(request);

  if (!session) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  const payload = request.body || {};
  const nextConnection = {
    userId: session.user.id,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  session.data.databaseConnections =
    session.data.databaseConnections.filter(
      (entry) => entry.userId !== session.user.id,
    );
  session.data.databaseConnections.push(nextConnection);
  writeData(session.data);

  response.json({ connection: nextConnection });
});

app.post("/api/chat/message", (request, response) => {
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

  response.json({
    reply: buildChatReply(String(message)),
  });
});

app.listen(port, () => {
  console.log(`Orrico API listening on http://localhost:${port}`);
});
