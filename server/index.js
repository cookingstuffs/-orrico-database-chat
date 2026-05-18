import { pathToFileURL } from "node:url";
import { app } from "./app.js";
import { checkStoreHealth, getStoreMode } from "./data-store.js";
import { getRuntimeSummary } from "./runtime.js";
const port = Number(process.env.PORT || 4000);

const currentModuleUrl = pathToFileURL(process.argv[1] || "").href;

if (import.meta.url === currentModuleUrl) {
  app.listen(port, async () => {
    const storeHealth = await checkStoreHealth().catch((error) => ({
      ok: false,
      error:
        error instanceof Error ? error.message : "Store check failed.",
    }));
    const runtime = getRuntimeSummary({
      storeMode: getStoreMode(),
      storeHealth,
    });

    console.log(`Orrico API listening on http://localhost:${port}`);
    console.log(
      JSON.stringify({
        level: "info",
        event: "server_start",
        port,
        runtime,
      }),
    );
  });
}
