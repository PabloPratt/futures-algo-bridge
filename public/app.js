const defaultConfig = {
  mode: "paper",
  tradingEnabled: false,
  requireApproval: true,
  webhookSecret: "",
  broker: {
    provider: "manual",
    accountLabel: ""
  },
  pickMyTrade: {
    connectedAccountsChecked: false,
    numericAccountIdConfirmed: false,
    webhookUrlSavedInTradingView: false,
    alertLogsClean: false,
    lastLogStatus: ""
  },
  tradingView: {
    paradoxConditionVisible: false,
    alertActive: false,
    webhookFieldVisible: false,
    alertMessageConfigured: false
  },
  apex: {
    accountPhase: "eval",
    accountSize: "25k",
    platform: "tradovate",
    profitTarget: "",
    drawdown: "",
    maxContracts: 1,
    automationAllowedConfirmed: false,
    copyTradingAllowedConfirmed: false
  },
  algo: {
    webhookUrl: "",
    sharedSecret: ""
  },
  risk: {
    maxContractsPerOrder: 1,
    allowedSymbols: ["MES", "MNQ", "MGC"],
    dailyLossLimitDollars: 250
  }
};

const storageKey = "futures-algo-bridge-config";
const form = document.querySelector("#configForm");
const verificationForm = document.querySelector("#verificationForm");
const payloadEl = document.querySelector("#payload");
const webhookUrlEl = document.querySelector("#webhookUrl");
const resultEl = document.querySelector("#result");
const enabledLabel = document.querySelector("#enabledLabel");
const modePill = document.querySelector("#modePill");
const checklistEl = document.querySelector("#checklist");
const checkScoreEl = document.querySelector("#checkScore");
const nextActionEl = document.querySelector("#nextAction");

const webhookUrl = `${location.origin}/api/webhook/tradingview`;
webhookUrlEl.textContent = webhookUrl;

refresh();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const current = getConfig();
  const data = new FormData(form);
  const config = {
    ...current,
    mode: data.get("tradingEnabled") ? "live" : "paper",
    tradingEnabled: data.get("tradingEnabled") === "on",
    requireApproval: data.get("requireApproval") === "on",
    webhookSecret: data.get("webhookSecret") || current.webhookSecret,
    broker: {
      provider: data.get("provider"),
      accountLabel: data.get("accountLabel")
    },
    apex: {
      ...current.apex,
      accountPhase: data.get("apexAccountPhase"),
      accountSize: data.get("apexAccountSize"),
      platform: data.get("provider"),
      profitTarget: data.get("apexProfitTarget"),
      drawdown: data.get("apexDrawdown"),
      maxContracts: Number(data.get("maxContractsPerOrder") || 1),
      automationAllowedConfirmed: data.get("apexAutomationAllowed") === "on",
      copyTradingAllowedConfirmed: data.get("apexCopyTradingAllowed") === "on"
    },
    algo: {
      webhookUrl: data.get("algoWebhookUrl"),
      sharedSecret: data.get("algoSharedSecret") || current.algo.sharedSecret
    },
    risk: {
      maxContractsPerOrder: Number(data.get("maxContractsPerOrder") || 1),
      dailyLossLimitDollars: Number(data.get("dailyLossLimitDollars") || 250),
      allowedSymbols: String(data.get("allowedSymbols") || "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
    }
  };

  saveConfig(config);
  resultEl.textContent = JSON.stringify({ ok: true, message: "Saved in this browser only." }, null, 2);
  refresh();
});

verificationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(verificationForm);
  const current = getConfig();
  const config = {
    ...current,
    pickMyTrade: {
      ...current.pickMyTrade,
      connectedAccountsChecked: data.get("pickMyTradeConnectedChecked") === "on",
      numericAccountIdConfirmed: data.get("pickMyTradeNumericIdConfirmed") === "on",
      webhookUrlSavedInTradingView: data.get("pickMyTradeWebhookSaved") === "on",
      alertLogsClean: data.get("pickMyTradeLogsClean") === "on",
      lastLogStatus: data.get("pickMyTradeLastLogStatus")
    },
    tradingView: {
      ...current.tradingView,
      paradoxConditionVisible: data.get("paradoxConditionVisible") === "on",
      alertActive: data.get("tradingViewAlertActive") === "on",
      webhookFieldVisible: data.get("tradingViewWebhookFieldVisible") === "on",
      alertMessageConfigured: data.get("tradingViewAlertMessageConfigured") === "on"
    }
  };

  saveConfig(config);
  resultEl.textContent = JSON.stringify({ ok: true, message: "Verification saved in this browser only." }, null, 2);
  refresh();
});

document.querySelector("#copyPayload").addEventListener("click", async () => {
  await navigator.clipboard.writeText(payloadEl.textContent);
});

document.querySelector("#sendTest").addEventListener("click", () => {
  const config = getConfig();
  const signal = normalizeSignal({
    source: "local-test",
    action: document.querySelector("#testAction").value,
    symbol: document.querySelector("#testSymbol").value,
    quantity: Number(document.querySelector("#testQuantity").value || 1),
    account: form.accountLabel.value
  });
  const result = routePaperSignal(signal, config);
  resultEl.textContent = JSON.stringify(result, null, 2);
});

function refresh() {
  const config = getConfig();
  const payload = buildTradingViewPayload(config);
  const checklist = buildSetupChecklist(config);

  form.provider.value = config.broker.provider;
  form.accountLabel.value = config.broker.accountLabel;
  form.apexAccountPhase.value = config.apex.accountPhase;
  form.apexAccountSize.value = config.apex.accountSize;
  form.apexProfitTarget.value = config.apex.profitTarget;
  form.apexDrawdown.value = config.apex.drawdown;
  form.algoWebhookUrl.value = config.algo.webhookUrl;
  form.webhookSecret.value = config.webhookSecret;
  form.algoSharedSecret.value = config.algo.sharedSecret;
  form.maxContractsPerOrder.value = config.risk.maxContractsPerOrder;
  form.dailyLossLimitDollars.value = config.risk.dailyLossLimitDollars;
  form.allowedSymbols.value = config.risk.allowedSymbols.join(",");
  form.apexAutomationAllowed.checked = config.apex.automationAllowedConfirmed;
  form.apexCopyTradingAllowed.checked = config.apex.copyTradingAllowedConfirmed;
  form.tradingEnabled.checked = config.tradingEnabled;
  form.requireApproval.checked = config.requireApproval;

  verificationForm.paradoxConditionVisible.checked = config.tradingView.paradoxConditionVisible;
  verificationForm.tradingViewWebhookFieldVisible.checked = config.tradingView.webhookFieldVisible;
  verificationForm.tradingViewAlertActive.checked = config.tradingView.alertActive;
  verificationForm.tradingViewAlertMessageConfigured.checked = config.tradingView.alertMessageConfigured;
  verificationForm.pickMyTradeWebhookSaved.checked = config.pickMyTrade.webhookUrlSavedInTradingView;
  verificationForm.pickMyTradeConnectedChecked.checked = config.pickMyTrade.connectedAccountsChecked;
  verificationForm.pickMyTradeNumericIdConfirmed.checked = config.pickMyTrade.numericAccountIdConfirmed;
  verificationForm.pickMyTradeLogsClean.checked = config.pickMyTrade.alertLogsClean;
  verificationForm.pickMyTradeLastLogStatus.value = config.pickMyTrade.lastLogStatus;

  payloadEl.textContent = JSON.stringify(payload, null, 2);
  enabledLabel.textContent = config.tradingEnabled ? "Live routing enabled" : "Execution disabled";
  modePill.textContent = config.mode === "live" ? "Live mode" : "Paper mode";
  renderChecklist(checklist);
}

function getConfig() {
  try {
    return mergeConfig(defaultConfig, JSON.parse(localStorage.getItem(storageKey) || "{}"));
  } catch {
    return defaultConfig;
  }
}

function saveConfig(config) {
  localStorage.setItem(storageKey, JSON.stringify(mergeConfig(defaultConfig, config)));
}

function buildTradingViewPayload(config) {
  return {
    secret: config.webhookSecret || "PASTE_BRIDGE_SECRET_HERE",
    source: "tradingview",
    symbol: "{{ticker}}",
    action: "{{strategy.order.action}}",
    quantity: "{{strategy.order.contracts}}",
    price: "{{close}}",
    time: "{{time}}",
    strategy: "{{strategy.order.comment}}",
    account: config.broker.accountLabel || "paper-account"
  };
}

function buildSetupChecklist(config) {
  const checks = [
    {
      label: "TradingView alert has webhook enabled",
      ok: Boolean(config.tradingView.webhookFieldVisible && config.pickMyTrade.webhookUrlSavedInTradingView),
      fix: "Open the Paradox alert, confirm Webhook URL is visible, and paste the PickMyTrade webhook URL."
    },
    {
      label: "Paradox alert is active",
      ok: Boolean(config.tradingView.paradoxConditionVisible && config.tradingView.alertActive),
      fix: "Open TradingView alerts and confirm the Paradox alert condition is active."
    },
    {
      label: "Alert message/template is configured",
      ok: Boolean(config.tradingView.alertMessageConfigured),
      fix: "Paste the exact PickMyTrade/Paradox alert message template into TradingView."
    },
    {
      label: "PickMyTrade account ID is numeric-only",
      ok: Boolean(config.pickMyTrade.connectedAccountsChecked && config.pickMyTrade.numericAccountIdConfirmed),
      fix: "In PickMyTrade, open Connected Accounts and copy the number-only account ID into the algo settings."
    },
    {
      label: "PickMyTrade alert logs are clean",
      ok: Boolean(config.pickMyTrade.alertLogsClean),
      fix: "Open PickMyTrade Alert Logs. If there is an error, copy the error text and fix it before the next session."
    },
    {
      label: "Apex eval rules are saved",
      ok: Boolean(config.apex.profitTarget && config.apex.drawdown && config.apex.maxContracts),
      fix: "From Apex, save the profit target, drawdown amount, and max contracts for this account."
    },
    {
      label: "Apex automation/copy-trading rules confirmed",
      ok: Boolean(config.apex.automationAllowedConfirmed || config.apex.copyTradingAllowedConfirmed),
      fix: "Check Apex rules for third-party bridges, automation, and copy trading before connecting more accounts."
    }
  ];
  const readyCount = checks.filter((check) => check.ok).length;
  const firstMissing = checks.find((check) => !check.ok);
  return {
    readyCount,
    total: checks.length,
    checks,
    nextAction: firstMissing
      ? firstMissing.fix
      : "Setup checks are complete. Wait for the next Paradox alert and confirm PickMyTrade logs show accepted execution."
  };
}

function normalizeSignal(payload) {
  const actionMap = { buy: "BUY", long: "BUY", sell: "SELL", short: "SELL", flat: "FLATTEN", close: "FLATTEN" };
  return {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    source: payload.source,
    symbol: String(payload.symbol || "").trim().toUpperCase(),
    action: actionMap[String(payload.action || "").toLowerCase()] || "UNKNOWN",
    quantity: Number(payload.quantity || 1),
    account: payload.account || ""
  };
}

function routePaperSignal(signal, config) {
  const allowed = config.risk.allowedSymbols.includes(signal.symbol.replace(/[0-9!].*$/, "")) ||
    config.risk.allowedSymbols.includes(signal.symbol);
  const errors = [];
  if (!allowed) errors.push(`${signal.symbol} is not allowed.`);
  if (signal.quantity > config.risk.maxContractsPerOrder) errors.push("Quantity exceeds max contracts.");
  return {
    ok: errors.length === 0,
    signal,
    mode: config.mode,
    routed: false,
    message: errors.length ? errors.join(" ") : "Paper signal accepted. No live order was placed."
  };
}

function renderChecklist(checklist) {
  checkScoreEl.textContent = `${checklist.readyCount} / ${checklist.total} ready`;
  nextActionEl.textContent = checklist.nextAction;
  checklistEl.innerHTML = checklist.checks
    .map((check) => `
      <article class="check-item">
        <span class="dot ${check.ok ? "ok" : ""}"></span>
        <div>
          <strong>${escapeHtml(check.label)}</strong>
          <p>${escapeHtml(check.ok ? "Ready" : check.fix)}</p>
        </div>
      </article>
    `)
    .join("");
}

function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    broker: { ...base.broker, ...(override?.broker || {}) },
    pickMyTrade: { ...base.pickMyTrade, ...(override?.pickMyTrade || {}) },
    tradingView: { ...base.tradingView, ...(override?.tradingView || {}) },
    apex: { ...base.apex, ...(override?.apex || {}) },
    tradier: { ...base.tradier, ...(override?.tradier || {}) },
    algo: { ...base.algo, ...(override?.algo || {}) },
    risk: { ...base.risk, ...(override?.risk || {}) }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
