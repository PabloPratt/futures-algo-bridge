# Futures Algo Bridge

Local setup wizard and webhook bridge for connecting TradingView alerts to a futures algo workflow.

This project intentionally starts in paper mode. It records and validates signals, can forward approved signals to a friend algo webhook, and leaves direct broker execution behind explicit adapter work for the broker/prop platform you choose.

## What It Does

- Shows a browser setup wizard at `http://127.0.0.1:8787`.
- Checks your likely real flow: TradingView Paradox alert -> PickMyTrade webhook -> Apex/Tradovate account.
- Generates the TradingView alert webhook URL and JSON message.
- Receives TradingView webhook signals at `/api/webhook/tradingview`.
- Validates symbol allowlists and max contracts.
- Defaults to execution disabled.
- Can forward to a configured friend algo webhook only when live routing is enabled and manual approval is disabled.

## What It Does Not Do Yet

- It does not bypass TradingView, prop-firm, broker, or exchange authorization.
- It does not store broker credentials in git or frontend code.
- It does not place live futures orders until a broker-specific adapter is added and tested.
- It does not create TradingView alerts automatically because TradingView does not provide a general retail alert-creation API.

## Run

```bash
cd /Users/regalia/futures-algo-bridge
npm start
```

Open:

```text
http://127.0.0.1:8787
```

## TradingView Setup

1. Run the bridge locally.
2. Open the setup page.
3. Save your account label, webhook secret, allowed symbols, and max contracts.
4. Copy the webhook URL into the TradingView alert Webhook URL field.
5. Copy the generated alert JSON into the TradingView alert Message field.
6. Send a local test signal before using a real alert.

## PickMyTrade Setup Checks

Use the setup checker in the app to confirm:

- The TradingView alert is active.
- The TradingView alert has the PickMyTrade webhook URL saved.
- The TradingView message field has the exact PickMyTrade/Paradox template.
- PickMyTrade `Connected Accounts` shows the Apex/Tradovate account as connected.
- The account ID used in the algo settings is number-only.
- PickMyTrade `Alert Logs` do not show account ID or template errors.

Do not paste broker passwords, PickMyTrade secrets, API tokens, or full private account numbers into chat or git-tracked files.

## Safety Defaults

- `mode: "paper"`
- `tradingEnabled: false`
- `requireApproval: true`
- `maxContractsPerOrder: 1`
- allowed symbols: `MES`, `MNQ`, `MGC`

Saved runtime config is written to:

```text
data/config.local.json
```

That path is ignored by git.

## Next Broker Adapter Step

To support real futures execution, pick the exact account stack first:

- Prop firm name
- Broker or trading platform
- API provider, such as Tradovate-compatible, Rithmic-compatible, NinjaTrader-compatible, or other
- Whether the account allows API/webhook automation under its rules

Then add an adapter under `src/adapters/` that maps normalized signals to that provider's official order API.
