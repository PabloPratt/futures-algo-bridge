import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const CONFIG_PATH = resolve("data/config.local.json");

export const defaultConfig = {
  mode: "paper",
  tradingEnabled: false,
  requireApproval: true,
  webhookSecret: "",
  broker: {
    provider: "manual",
    accountLabel: "",
    apiBaseUrl: "",
    credentialsStoredExternally: true
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
    alertMessageConfigured: false,
    layoutName: "Asia",
    market: "MES"
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
  tradier: {
    accountType: "unknown",
    relevantToFuturesSetup: false,
    sandboxTokenAvailable: false
  },
  algo: {
    name: "",
    webhookUrl: "",
    sharedSecret: ""
  },
  risk: {
    maxContractsPerOrder: 1,
    allowedSymbols: ["MES", "MNQ", "MGC"],
    dailyLossLimitDollars: 250,
    flattenAt: "15:55"
  }
};

export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return mergeConfig(defaultConfig, JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") return defaultConfig;
    throw error;
  }
}

export async function saveConfig(nextConfig) {
  const config = mergeConfig(defaultConfig, nextConfig);
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(redactRuntimeSecrets(config), null, 2));
  return config;
}

export function publicConfig(config) {
  return {
    ...config,
    webhookSecret: config.webhookSecret ? "configured" : "",
    algo: {
      ...config.algo,
      sharedSecret: config.algo.sharedSecret ? "configured" : ""
    }
  };
}

export function buildTradingViewPayload(config) {
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

function redactRuntimeSecrets(config) {
  return {
    ...config,
    broker: {
      ...config.broker,
      credentialsStoredExternally: true
    }
  };
}
