const baseUrl = String(
  process.env.SMOKE_BASE_URL || "https://retail-shopkeeper.vercel.app",
).replace(/\/+$/, "");

async function fetchJson(pathname, expectedStatus) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (response.status !== expectedStatus) {
    throw new Error(
      `${pathname} returned ${response.status}, expected ${expectedStatus}. Body: ${typeof body === "string" ? body : JSON.stringify(body)}`,
    );
  }

  return body;
}

async function main() {
  console.log(`Smoke base URL: ${baseUrl}`);

  const health = await fetchJson("/api/health", 200);
  console.log("Health status:", health.status);
  console.log("Store mode:", health.store?.mode);

  const ready = await fetchJson("/api/health/ready", 200);
  console.log("Readiness:", ready.ready);

  if (!ready.ready) {
    throw new Error(
      `Readiness reported false. Body: ${JSON.stringify(ready)}`,
    );
  }

  console.log("Production smoke test passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
