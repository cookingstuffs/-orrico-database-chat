import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

function start(command, label) {
  const child = isWindows
    ? spawn("cmd.exe", ["/d", "/s", "/c", command], {
        stdio: "inherit",
      })
    : spawn("sh", ["-lc", command], {
        stdio: "inherit",
      });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${label}] stopped with signal ${signal}`);
      return;
    }

    console.log(`[${label}] exited with code ${code ?? 0}`);
  });

  child.on("error", (error) => {
    console.error(`[${label}] failed to start`, error);
  });

  return child;
}

const children = [
  start("npm run dev:client", "client"),
  start("npm run dev:server", "server"),
];

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});
