export function buildSetupChecklist(config) {
  const checks = [
    {
      id: "tradingview-webhook",
      label: "TradingView alert has webhook enabled",
      ok: Boolean(config.tradingView.webhookFieldVisible && config.pickMyTrade.webhookUrlSavedInTradingView),
      fix: "Open the Paradox alert, confirm Webhook URL is visible, and paste the PickMyTrade webhook URL."
    },
    {
      id: "tradingview-active",
      label: "Paradox alert is active",
      ok: Boolean(config.tradingView.paradoxConditionVisible && config.tradingView.alertActive),
      fix: "Open TradingView alerts and confirm the Paradox alert condition is active."
    },
    {
      id: "alert-message",
      label: "Alert message/template is configured",
      ok: Boolean(config.tradingView.alertMessageConfigured),
      fix: "Paste the exact PickMyTrade/Paradox alert message template into TradingView."
    },
    {
      id: "pickmytrade-account",
      label: "PickMyTrade account ID is numeric-only",
      ok: Boolean(config.pickMyTrade.connectedAccountsChecked && config.pickMyTrade.numericAccountIdConfirmed),
      fix: "In PickMyTrade, open Connected Accounts and copy the number-only account ID into the algo settings."
    },
    {
      id: "pickmytrade-logs",
      label: "PickMyTrade alert logs are clean",
      ok: Boolean(config.pickMyTrade.alertLogsClean),
      fix: "Open PickMyTrade Alert Logs. If there is an error, copy the error text and fix it before the next session."
    },
    {
      id: "apex-rules",
      label: "Apex eval rules are saved",
      ok: Boolean(config.apex.profitTarget && config.apex.drawdown && config.apex.maxContracts),
      fix: "From Apex, save the profit target, drawdown amount, and max contracts for this account."
    },
    {
      id: "automation-rule",
      label: "Apex automation/copy-trading rules confirmed",
      ok: Boolean(config.apex.automationAllowedConfirmed || config.apex.copyTradingAllowedConfirmed),
      fix: "Check Apex rules for third-party bridges, automation, and copy trading before connecting more accounts."
    }
  ];

  const readyCount = checks.filter((check) => check.ok).length;
  return {
    ready: readyCount === checks.length,
    readyCount,
    total: checks.length,
    checks,
    nextAction: getNextAction(checks)
  };
}

function getNextAction(checks) {
  const firstMissing = checks.find((check) => !check.ok);
  if (!firstMissing) {
    return "Setup checks are complete. Wait for the next Paradox alert and confirm PickMyTrade logs show accepted execution.";
  }
  return firstMissing.fix;
}
