const DEFAULT_API_BASE_URL =
  typeof window !== "undefined" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "/api"
    : "http://localhost:4000/api";

const runtimeEnv =
  typeof globalThis !== "undefined" &&
  "process" in globalThis &&
  typeof globalThis.process === "object" &&
  globalThis.process &&
  "env" in globalThis.process
    ? (globalThis.process.env as Record<string, string | undefined>)
    : {};

const API_BASE_URL = runtimeEnv.API_BASE_URL || DEFAULT_API_BASE_URL;
const DEMO_EMAIL = "demo@orrico.com";
const DEMO_PASSWORD = "demo123";
const LOCAL_DEMO_TOKEN = "local-demo-session";
const LOCAL_DB_CONNECTION_KEY = "orrico_db_connection";

export interface ChatMessageResponse {
  reply: string;
  sql: string | null;
  rows: Record<string, unknown>[];
  mode: string;
}

export interface CsvImportResponse {
  databasePath: string;
  tableName: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
  }>;
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
}

function getDemoUser() {
  return {
    id: "demo-user",
    firstName: "Demo",
    lastName: "User",
    email: DEMO_EMAIL,
    businessName: "Demo Retail Store",
    authProvider: "demo",
    createdAt: new Date().toISOString(),
  };
}

function normalizeMessage(message: string) {
  return message.toLowerCase().replace(/[^\w\s]/g, " ").trim();
}

function buildLocalChatReply(message: string) {
  const normalizedMessage = normalizeMessage(message);

  if (
    normalizedMessage.includes("sales yesterday") ||
    normalizedMessage.includes("yesterday sales")
  ) {
    return "Yesterday your store closed at Rs 2,84,750 across 43 orders. Mobile accessories and power banks led the strongest movement.";
  }

  if (
    normalizedMessage.includes("top product") ||
    normalizedMessage.includes("best product")
  ) {
    return "Your top movers right now are Xiaomi Power Bank 20000mAh, Realme Buds Air 3, Logitech K380 Keyboard, Samsung Galaxy A34 5G, and Samsung 43-inch Smart TV.";
  }

  if (
    normalizedMessage.includes("inventory") ||
    normalizedMessage.includes("stock") ||
    normalizedMessage.includes("low stock")
  ) {
    return "Inventory is mostly healthy, but Lenovo IdeaPad Slim 3, Samsung 43-inch Smart TV, HP LaserJet M126nw, and Samsung Galaxy A34 5G are getting low.";
  }

  if (
    normalizedMessage.includes("profit") ||
    normalizedMessage.includes("margin")
  ) {
    return "Your current gross margin is about 32.8%. Accessories are the strongest margin driver, while premium hardware remains important for revenue.";
  }

  if (
    normalizedMessage.includes("customer") ||
    normalizedMessage.includes("repeat buyer")
  ) {
    return "Your strongest customer segment is repeat buyers. Amit Kumar is the top individual customer this month, and repeat customers are driving more than half of revenue.";
  }

  return "I can help with sales, products, inventory, customers, and margins. Ask me something direct about your store and I'll keep the answer sharp.";
}

function getStoredCurrentUser() {
  const storedUser = localStorage.getItem("orrico_current_user");
  return storedUser ? JSON.parse(storedUser) : null;
}

function getStoredDatabaseConnection() {
  const storedConnection = localStorage.getItem(LOCAL_DB_CONNECTION_KEY);
  return storedConnection ? JSON.parse(storedConnection) : null;
}

async function request(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (options.authenticated) {
    const token = localStorage.getItem("orrico_auth_token");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: "Request failed." };

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export const api = {
  health() {
    return request("/health").catch(() => ({
      status: "ok",
      mode: "local-demo",
    }));
  },
  signup(payload: Record<string, unknown>) {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async login(payload: Record<string, unknown>) {
    try {
      return await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const normalizedEmail = String(payload.email || "")
        .trim()
        .toLowerCase();
      const password = String(payload.password || "");

      if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
        const user = getDemoUser();
        localStorage.setItem("orrico_auth_token", LOCAL_DEMO_TOKEN);
        localStorage.setItem("orrico_current_user", JSON.stringify(user));

        return {
          token: LOCAL_DEMO_TOKEN,
          user,
        };
      }

      throw error;
    }
  },
  googleLogin(payload: Record<string, unknown>) {
    return request("/auth/google", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async session() {
    try {
      return await request("/auth/session", { authenticated: true });
    } catch (error) {
      const token = localStorage.getItem("orrico_auth_token");
      const user = getStoredCurrentUser();

      if (token === LOCAL_DEMO_TOKEN && user) {
        return { user };
      }

      throw error;
    }
  },
  async logout() {
    try {
      return await request("/auth/logout", {
        method: "POST",
        authenticated: true,
      });
    } catch {
      return null;
    }
  },
  async currentDatabaseConnection() {
    try {
      return await request("/database/current", {
        authenticated: true,
      });
    } catch {
      return {
        connection: getStoredDatabaseConnection(),
      };
    }
  },
  async databaseSchema() {
    try {
      return await request("/database/schema", {
        authenticated: true,
      });
    } catch {
      const localConnection = getStoredDatabaseConnection();

      return {
        databasePath: "local-demo-mode",
        schema: localConnection
          ? [
              {
                table: localConnection.databaseName || "demo_data",
                columns: [],
              },
            ]
          : [],
      };
    }
  },
  async saveDatabaseConnection(payload: Record<string, unknown>) {
    try {
      return await request("/database/connect", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify(payload),
      });
    } catch {
      const connection = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        LOCAL_DB_CONNECTION_KEY,
        JSON.stringify(connection),
      );

      return { connection };
    }
  },
  importCsvDataset(payload: {
    csvContent: string;
    fileName: string;
    tableName?: string;
  }): Promise<CsvImportResponse> {
    return request("/database/import-csv", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(payload),
    }) as Promise<CsvImportResponse>;
  },
  async sendChatMessage(message: string): Promise<ChatMessageResponse> {
    try {
      return (await request("/chat/message", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({ message }),
      })) as ChatMessageResponse;
    } catch {
      return {
        reply: buildLocalChatReply(message),
        sql: null,
        rows: [],
        mode: "local-demo",
      };
    }
  },
};
