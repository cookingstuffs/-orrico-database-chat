import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const host = "127.0.0.1";
const port = 3000;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
};

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Unable to read file.");
      return;
    }

    response.writeHead(200, { "Content-Type": type });
    response.end(buffer);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const resolvedPath =
    pathname === "/" ? path.join(distDir, "index.html") : path.join(distDir, pathname);

  if (!resolvedPath.startsWith(distDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(response, resolvedPath);
      return;
    }

    const fallbackPath = path.join(distDir, "index.html");
    sendFile(response, fallbackPath);
  });
});

server.listen(port, host, () => {
  console.log(`Static client serving on http://${host}:${port}`);
});
