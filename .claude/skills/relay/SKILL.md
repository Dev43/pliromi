---
name: relay
description: Cross-chain bridging, swapping, and payments via the Relay API — get quotes, execute bridges, check status, and discover supported chains and tokens across 75+ networks.
version: 1.0.0
metadata:
  openclaw:
    requires:
      anyBins:
        - node
        - curl
    emoji: "\U0001F310"
    homepage: https://relay.link
    os:
      - darwin
      - linux
---

# Relay — Cross-Chain Bridge & Swap API

Cross-chain bridging, swapping, and payments across 75+ blockchain networks. Relay uses a solver-based intent system: users deposit funds on an origin chain and solvers fill orders on the destination chain, then settle via the protocol.

**Base URLs:**
- Mainnet: `https://api.relay.link`
- Testnet: `https://api.testnets.relay.link`

## When to use

Use this skill when the user asks to:

- Bridge tokens between chains (cross-chain transfer)
- Swap tokens across chains or same-chain
- Get a quote for a cross-chain transfer
- Check the status of a bridge/swap transaction
- Look up supported chains, tokens, or currencies on Relay
- Build integrations with the Relay API
- Use deposit addresses for bridging without calldata
- Execute gasless transactions via Relay
- Set up app fees or claim fee revenue

## Authentication

**Header:** `x-api-key: YOUR_API_KEY`

API keys are optional for most endpoints but required for:
- `/execute` (gasless execution)
- `/fast-fill`
- Fee sponsorship features
- Webhooks

### Rate Limits

| Endpoint | Without Key | With Key |
|----------|------------|----------|
| `/quote` | 50 req/min | 10 req/sec |
| `/requests` | 200 req/min | 10 req/sec |
| `/transactions/status` | 200 req/min | 10 req/sec |
| Other | 200 req/min | 200 req/min |

## Core Flow

1. **Discover** — `GET /chains` and `POST /currencies/v2` to find supported networks and tokens
2. **Quote** — `POST /quote/v2` to get executable steps with fees and transaction data
3. **Execute** — Iterate through returned steps, sign and submit transactions
4. **Monitor** — `GET /intents/status/v3` or WebSocket to poll until `success`

---

## API Endpoints

### POST /quote/v2 — Get Quote (primary endpoint)

Returns executable steps for bridging, swapping, or calling cross-chain. This is the main endpoint you'll use.

```bash
curl -X POST https://api.relay.link/quote/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0xYOUR_ADDRESS",
    "originChainId": 1,
    "destinationChainId": 8453,
    "originCurrency": "0x0000000000000000000000000000000000000000",
    "destinationCurrency": "0x0000000000000000000000000000000000000000",
    "amount": "1000000000000000",
    "tradeType": "EXACT_INPUT"
  }'
```

**Required parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | Depositing address on origin chain |
| `originChainId` | number | Source chain ID |
| `destinationChainId` | number | Destination chain ID |
| `originCurrency` | string | Source token address (`0x0000...0000` for native) |
| `destinationCurrency` | string | Destination token address |
| `amount` | string | Amount in smallest unit (e.g. wei) |
| `tradeType` | enum | `EXACT_INPUT`, `EXACT_OUTPUT`, or `EXPECTED_OUTPUT` |

**Trade types:**
- `EXACT_INPUT` — User specifies input amount; output is calculated
- `EXPECTED_OUTPUT` — User specifies desired output; input is calculated (output may vary with slippage)
- `EXACT_OUTPUT` — User specifies precise output; fails and refunds if exact amount can't be delivered

Full parameter reference: see `{baseDir}/references/api.md`

**Response** contains `steps`, `fees`, `details`, and `protocol` objects. Each step has an `id`, `kind` (`transaction` or `signature`), and `items` array with transaction/signature data and a `check` endpoint for polling status.

### GET /intents/status/v3 — Check Status

```bash
curl "https://api.relay.link/intents/status/v3?requestId=0x..."
```

**Response:**
```json
{
  "status": "success",
  "inTxHashes": ["0x..."],
  "txHashes": ["0x..."],
  "updatedAt": 1713290386145,
  "originChainId": 1,
  "destinationChainId": 8453
}
```

**Status values:** `waiting` → `depositing` → `pending` → `submitted` → `success` (or `delayed`, `refunded`, `failure`, `refund`)

### GET /chains — Get Supported Chains

```bash
curl https://api.relay.link/chains
```

Returns array of chain objects with `id`, `name`, `displayName`, `vmType`, `httpRpcUrl`, `explorerUrl`, `currency`, `erc20Currencies`, etc.

### POST /currencies/v2 — Search Tokens

```bash
curl -X POST https://api.relay.link/currencies/v2 \
  -H "Content-Type: application/json" \
  -d '{"chainIds": [1, 8453], "term": "USDC", "verified": true, "limit": 10}'
```

### GET /requests/v2 — Get Request History

```bash
curl "https://api.relay.link/requests/v2?user=0x...&limit=10"
```

### POST /execute — Gasless Execution (requires API key)

```bash
curl -X POST https://api.relay.link/execute \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{
    "executionKind": "rawCalls",
    "data": {
      "chainId": 8453,
      "to": "0x...",
      "data": "0x...",
      "value": "0"
    }
  }'
```

### GET /currencies/token/price — Get Token Price

```bash
curl "https://api.relay.link/currencies/token/price?address=0x...&chainId=1"
```

### GET /chains/liquidity — Get Chain Liquidity

```bash
curl "https://api.relay.link/chains/liquidity?chainId=8453"
```

### GET /swap-sources — Get DEX Sources

```bash
curl "https://api.relay.link/swap-sources?chainId=8453"
```

---

## Step Execution Flow

Quote responses return a `steps` array. Process each step sequentially:

**Step IDs:**
- `approve` — ERC-20 approval (transaction)
- `deposit` — Cross-chain fund deposit (transaction)
- `swap` — Same-chain swap (transaction)
- `send` — Fund transfer (transaction)
- `authorize` — EIP-191 signature
- `authorize1` — Cross-chain permit (Permit2/EIP-3009)
- `authorize2` — Same-chain swap permit

**Common flows:**
- Cross-chain bridge (native): `deposit`
- Cross-chain bridge (ERC-20): `approve` → `deposit`
- Same-chain swap: `swap`
- Gasless cross-chain: `authorize1` (signature only)

After submitting each step, poll the `check.endpoint` URL until status is `success`.

---

## Deposit Addresses

Set `useDepositAddress: true` in the quote request. The user sends funds to the returned address — no calldata needed. Useful for wallets that can't submit arbitrary calldata.

- **Open mode** (default): accepts any deposit, regenerates quote post-deposit
- **Strict mode** (`strict: true`): tied to a specific order

---

## WebSocket

Connect to `wss://ws.relay.link?apiKey=YOUR_KEY` for real-time status updates:

```json
{"type": "subscribe", "event": "request.status.updated", "filters": {"id": "0x..."}}
```

---

## Node.js Example — Bridge ETH from Ethereum to Base

```javascript
import { ethers } from "ethers";
import { signAndSend } from "@open-wallet-standard/core";

const API = "https://api.relay.link";
const FROM = "0xYOUR_ADDRESS";
const WALLET_NAME = "my-wallet";

// 1. Get quote
const quoteRes = await fetch(`${API}/quote/v2`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user: FROM,
    originChainId: 1,
    destinationChainId: 8453,
    originCurrency: "0x0000000000000000000000000000000000000000",
    destinationCurrency: "0x0000000000000000000000000000000000000000",
    amount: "10000000000000000", // 0.01 ETH
    tradeType: "EXACT_INPUT",
  }),
});
const quote = await quoteRes.json();

// 2. Execute each step
for (const step of quote.steps) {
  for (const item of step.items) {
    if (step.kind === "transaction") {
      const txData = item.data;
      // Build and sign the transaction using OWS or ethers
      // Then poll item.check.endpoint until status === "success"
    }
  }
}
```

## Supported Chains (75+)

Key chains: Ethereum (1), Optimism (10), BNB (56), Polygon (137), Arbitrum (42161), Base (8453), Avalanche (43114), Solana (792703809), Bitcoin (8253038), Tron (728126428), zkSync (324), Linea (59144), Scroll (534352), Zora (7777777), Blast (81457), Mantle (5000), Berachain (80094), Hyperliquid (1337), Abstract (2741), Unichain (130), Monad (143), Sonic (146), World Chain (480), Tempo (4217), and many more.

Full chain list: `GET https://api.relay.link/chains`
