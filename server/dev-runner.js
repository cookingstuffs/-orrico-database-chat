import { spawn } from "node:child_process";
import net from "node:net";

const isWindows = process.platform === "win32";

function runBuild() {
  return new Promise((resolve, reject) => {
    const build = isWindows
      ? spawn("cmd.exe", ["/d", "/s", "/c", "npm run build"], {
          stdio: "inherit",
        })
      : spawn("sh", ["-lc", "npm run build"], {
          stdio: "inherit",
        });

    build.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code ?? 1}`));
    });

    build.on("error", reject);
  });
}

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

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

const children = [];

function stopAll() {
  for (const child of children) {
    if (child && !child.killed) {
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

runBuild()
  .then(async () => {
    const clientPortAvailable = await isPortAvailable(3000);
    const serverPortAvailable = await isPortAvailable(4000, "0.0.0.0");

    if (clientPortAvailable) {
      children.push(start("node server/static-client.js", "client"));
    } else {
      console.log("[client] port 3000 is already in use, leaving the existing app server running");
    }

    if (serverPortAvailable) {
      children.push(start("npm run dev:server", "server"));
    } else {
      console.log("[server] port 4000 is already in use, leaving the existing API server running");
    }

    if (children.length === 0) {
      console.log("[dev-runner] app is already running on http://127.0.0.1:3000 and http://localhost:4000");
    }
  })
  .catch((error) => {
    console.error("[dev-runner] unable to start local app", error);
    process.exit(1);
  });
