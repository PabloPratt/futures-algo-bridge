const ACTIONS = new Map([
  ["buy", "BUY"],
  ["long", "BUY"],
  ["sell", "SELL"],
  ["short", "SELL"],
  ["flat", "FLATTEN"],
  ["close", "FLATTEN"],
  ["exit", "FLATTEN"]
]);

export function normalizeSignal(payload) {
  const action = ACTIONS.get(String(payload.action || payload.side || "").toLowerCase());
  if (!action) {
    throw httpError(400, "Unsupported action. Use buy, sell, short, long, flat, close, or exit.");
  }

  const symbol = String(payload.symbol || payload.ticker || "").trim().toUpperCase();
  if (!symbol) throw httpError(400, "Missing symbol.");

  const quantity = Number(payload.quantity || payload.qty || payload.contracts || 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw httpError(400, "Quantity must be a positive number.");
  }

  return {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source: payload.source || "tradingview",
    symbol,
    action,
    quantity,
    price: payload.price ? Number(payload.price) : null,
    account: payload.account || "",
    strategy: payload.strategy || payload.comment || ""
  };
}

export function validateSignal(signal, config) {
  const symbolRoot = signal.symbol.replace(/[0-9!].*$/, "");
  const allowed = config.risk.allowedSymbols.map((value) => value.toUpperCase());
  if (!allowed.includes(symbolRoot) && !allowed.includes(signal.symbol)) {
    throw httpError(403, `Symbol ${signal.symbol} is not in the allowed list.`);
  }

  if (signal.quantity > config.risk.maxContractsPerOrder) {
    throw httpError(403, `Quantity ${signal.quantity} exceeds maxContractsPerOrder.`);
  }

  return signal;
}

export async function routeSignal(signal, config) {
  const decision = {
    signal,
    mode: config.mode,
    tradingEnabled: Boolean(config.tradingEnabled),
    requireApproval: Boolean(config.requireApproval),
    routed: false,
    destination: config.algo.webhookUrl ? "friend-algo-webhook" : "local-paper-log",
    message: "Recorded signal only. Live execution is disabled."
  };

  if (!config.tradingEnabled || config.mode !== "live") {
    return decision;
  }

  if (config.requireApproval) {
    decision.message = "Signal is valid but waiting for manual approval.";
    return decision;
  }

  if (config.algo.webhookUrl) {
    await forwardToAlgo(signal, config);
    decision.routed = true;
    decision.message = "Forwarded to configured algo webhook.";
    return decision;
  }

  decision.message = "Live mode requested, but no execution adapter is configured.";
  return decision;
}

async function forwardToAlgo(signal, config) {
  const response = await fetch(config.algo.webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.algo.sharedSecret ? { "x-bridge-secret": config.algo.sharedSecret } : {})
    },
    body: JSON.stringify(signal)
  });

  if (!response.ok) {
    throw httpError(502, `Algo webhook returned ${response.status}.`);
  }
}

export function verifySecret(payload, config, request) {
  if (!config.webhookSecret) return;

  const headerSecret = request.headers.get("x-bridge-secret");
  const supplied = headerSecret || payload.secret;
  if (supplied !== config.webhookSecret) {
    throw httpError(401, "Invalid webhook secret.");
  }
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
