import crypto from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

export function requestContextMiddleware(request, response, next) {
  request.requestId =
    request.headers["x-request-id"] || crypto.randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
}

export function requestLoggerMiddleware(request, response, next) {
  const startedAt = Date.now();

  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        timestamp: nowIso(),
        level: "info",
        event: "http_request",
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs,
      }),
    );
  });

  next();
}

export function errorHandler(error, request, response, _next) {
  const statusCode = Number(error?.statusCode || 500);
  const message =
    statusCode >= 500
      ? "Internal server error."
      : error?.message || "Request failed.";

  console.error(
    JSON.stringify({
      timestamp: nowIso(),
      level: "error",
      event: "http_error",
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
  );

  response.status(statusCode).json({ error: message });
}
