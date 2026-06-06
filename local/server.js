import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { buildTradingViewPayload, loadConfig, publicConfig, saveConfig } from "../src/config.js";
import { normalizeSignal, routeSignal, validateSignal, verifySecret } from "../src/router.js";
import { buildSetupChecklist } from "../src/setup-checker.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return json(response, { config: publicConfig(await loadConfig()) });
    }

    if (request.method === "POST" && url.pathname === "/api/config") {
      const existing = await loadConfig();
      const body = await readJson(request);
      const config = await saveConfig(preserveSecrets(existing, body));
      return json(response, { ok: true, config: publicConfig(config) });
    }

    if (request.method === "GET" && url.pathname === "/api/tradingview-payload") {
      const config = await loadConfig();
      return json(response, { payload: buildTradingViewPayload(config) });
    }

    if (request.method === "GET" && url.pathname === "/api/setup-checklist") {
      const config = await loadConfig();
      return json(response, { checklist: buildSetupChecklist(config) });
    }

    if (request.method === "POST" && url.pathname === "/api/webhook/tradingview") {
      const config = await loadConfig();
      const payload = await readJson(request);
      verifySecret(payload, config, request);
      const signal = validateSignal(normalizeSignal(payload), config);
      const result = await routeSignal(signal, config);
      return json(response, { ok: true, result });
    }

    if (request.method === "POST" && url.pathname === "/api/test-signal") {
      const config = await loadConfig();
      const signal = validateSignal(normalizeSignal(await readJson(request)), config);
      const result = await routeSignal(signal, config);
      return json(response, { ok: true, result });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    return json(response, { ok: false, error: error.message || "Unexpected error" }, error.status || 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Bifrost Prop Bridge running at http://${HOST}:${PORT}`);
});

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function serveStatic(pathname, response) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join("public", safePath);
  const body = await readFile(filePath);
  response.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  response.end(body);
}

function json(response, body, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

function preserveSecrets(existing, next) {
  const config = structuredClone(next);
  if (!config.webhookSecret || config.webhookSecret === "configured") {
    config.webhookSecret = existing.webhookSecret;
  }
  config.algo = config.algo || {};
  if (!config.algo.sharedSecret || config.algo.sharedSecret === "configured") {
    config.algo.sharedSecret = existing.algo.sharedSecret;
  }
  return config;
}
