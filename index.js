import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

export default async function handler(request, response) {
  try {
    const url = new URL(request.url, "https://futures-algo-bridge.vercel.app");

    if (url.pathname === "/api/webhook/tradingview") {
      if (request.method !== "POST") {
        response.setHeader("allow", "POST");
        return json(response, { ok: false, error: "Method not allowed" }, 405);
      }
      return json(response, {
        ok: true,
        mode: "observe-only",
        message: "Webhook received. This hosted endpoint does not place trades or store broker credentials."
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(response, { ok: false, error: "Method not allowed" }, 405);
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(process.cwd(), "public", safePath);
    const body = await readFile(filePath);
    response.statusCode = 200;
    response.setHeader("content-type", mimeTypes[extname(filePath)] || "application/octet-stream");
    if (request.method === "HEAD") return response.end();
    return response.end(body);
  } catch {
    return json(response, { ok: false, error: "Not found" }, 404);
  }
}

function json(response, body, status = 200) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
