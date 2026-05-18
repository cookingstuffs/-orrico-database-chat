const DEFAULT_APP_ENCRYPTION_KEY = "replace-with-a-strong-secret-key";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getCorsOrigins() {
  const configuredOrigins = String(
    process.env.CORS_ALLOWED_ORIGINS || "",
  )
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
}

export function getMissingProductionEnvVars() {
  if (!isProduction()) {
    return [];
  }

  const requiredVariables = [
    "DATABASE_URL",
    "APP_ENCRYPTION_KEY",
    "APP_BASE_URL",
    "EMAIL_FROM",
    "RESEND_API_KEY",
  ];

  return requiredVariables.filter(
    (name) => !String(process.env[name] || "").trim(),
  );
}

export function getRuntimeWarnings({ storeMode }) {
  const warnings = [];

  if (
    String(process.env.APP_ENCRYPTION_KEY || "").trim() ===
    DEFAULT_APP_ENCRYPTION_KEY
  ) {
    warnings.push(
      "APP_ENCRYPTION_KEY is using the example value and must be replaced.",
    );
  }

  if (!String(process.env.APP_BASE_URL || "").trim()) {
    warnings.push("APP_BASE_URL is not configured.");
  }

  if (!String(process.env.EMAIL_FROM || "").trim()) {
    warnings.push("EMAIL_FROM is not configured.");
  }

  if (!String(process.env.RESEND_API_KEY || "").trim()) {
    warnings.push("RESEND_API_KEY is not configured.");
  }

  if (isProduction() && storeMode !== "postgresql") {
    warnings.push(
      "Production is not using PostgreSQL app persistence.",
    );
  }

  warnings.push(
    ...getMissingProductionEnvVars().map(
      (name) => `Missing production environment variable: ${name}.`,
    ),
  );

  return warnings;
}

export function getRuntimeSummary({ storeMode, storeHealth }) {
  return {
    environment: process.env.NODE_ENV || "development",
    storeMode,
    appBaseUrl: process.env.APP_BASE_URL || "",
    corsAllowedOrigins: getCorsOrigins(),
    emailProvider: process.env.EMAIL_PROVIDER || "resend",
    emailConfigured: Boolean(
      String(process.env.EMAIL_FROM || "").trim() &&
        String(process.env.RESEND_API_KEY || "").trim(),
    ),
    storeHealthy: Boolean(storeHealth?.ok),
    missingProductionEnvVars: getMissingProductionEnvVars(),
    warnings: getRuntimeWarnings({ storeMode }),
  };
}
