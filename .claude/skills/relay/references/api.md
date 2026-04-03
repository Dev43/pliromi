# Relay API Reference

Base URL: `https://api.relay.link` (mainnet) | `https://api.testnets.relay.link` (testnet)

---

## POST /quote/v2

Returns executable steps for bridging, swapping, or calling cross-chain.

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | Depositing address on origin chain |
| `originChainId` | number | Source chain ID |
| `destinationChainId` | number | Destination chain ID |
| `originCurrency` | string | Source token address (`0x0000000000000000000000000000000000000000` for native) |
| `destinationCurrency` | string | Destination token address |
| `amount` | string | Amount in smallest unit (e.g. wei) |
| `tradeType` | enum | `EXACT_INPUT`, `EXACT_OUTPUT`, `EXPECTED_OUTPUT` |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `recipient` | string | Receiving address (defaults to `user`) |
| `refundTo` | string | Refund address on failure |
| `refundType` | enum | `origin` or `destination` |
| `slippageTolerance` | string | Basis points (e.g. `"50"` = 0.5%); auto-calculated if omitted |
| `latePaymentSlippageTolerance` | string | Extra slippage if deposit is delayed past deadline |
| `txs` | array | Destination chain calls: `[{to, value, data, originalTxValue}]` |
| `txsGasLimit` | number | Gas limit for destination calls |
| `authorizationList` | array | EIP-7702 authorizations: `[{chainId, address, nonce, yParity, r, s}]` |
| `useDepositAddress` | boolean | Enable deposit address mode (no calldata needed) |
| `strict` | boolean | Strict deposit address tied to specific order |
| `useExternalLiquidity` | boolean | Canonical+ bridging (slower but more liquidity) |
| `useFallbacks` | boolean | Enable fallback routes |
| `usePermit` | boolean | Use EIP-3009 permit (USDC, etc.) |
| `permitExpiry` | number | Permit validity in seconds (default: 600) |
| `topupGas` | boolean | Include destination gas topup |
| `topupGasAmount` | string | Gas topup in USD decimal (`"100000"` = $1) |
| `appFees` | array | `[{recipient: "0x...", fee: "100"}]` (fee in bps) |
| `subsidizeFees` | boolean | Sponsor covers destination fees |
| `sponsoredFeeComponents` | array | `["execution", "swap", "relay", "app"]` |
| `maxSubsidizationAmount` | string | Max USDC subsidy (`"1000000"` = $1) |
| `subsidizeRent` | boolean | Sponsor Solana rent |
| `depositFeePayer` | string | Solana rent payer address |
| `includedSwapSources` | array | DEX sources to include |
| `excludedSwapSources` | array | DEX sources to exclude |
| `includedOriginSwapSources` | array | Origin-specific swap sources |
| `includedDestinationSwapSources` | array | Destination-specific swap sources |
| `disableOriginSwaps` | boolean | Disable origin chain swaps |
| `forceSolverExecution` | boolean | Force solver for same-chain swaps |
| `explicitDeposit` | boolean | Avoid direct depository transfers (default: true) |
| `enableTrueExactOutput` | boolean | Send swap surplus to solver |
| `overridePriceImpact` | boolean | Ignore price impact errors |
| `fixedRate` | string | Fixed spread quote rate |
| `maxRouteLength` | number | Max Solana swap route hops |
| `useSharedAccounts` | boolean | Solana ATA optimization |
| `includeComputeUnitLimit` | boolean | Solana compute unit limit |
| `originGasOverhead` | number | Gas overhead for smart wallet execution |
| `additionalData` | object | Route-specific data (e.g. `{userPublicKey}` for Bitcoin P2SH) |
| `referrer` | string | Referral tracking |
| `referrerAddress` | string | Referral address |

### Response (200)

```json
{
  "steps": [
    {
      "id": "deposit",
      "action": "Confirm transaction in your wallet",
      "description": "Deposit funds for filling",
      "kind": "transaction",
      "requestId": "0x...",
      "items": [
        {
          "status": "incomplete",
          "data": {
            "chainId": 1,
            "to": "0x...",
            "from": "0x...",
            "data": "0x...",
            "value": "1000000000000000",
            "maxFeePerGas": "30000000000",
            "maxPriorityFeePerGas": "1000000000",
            "gas": "200000"
          },
          "check": {
            "endpoint": "/intents/status/v3?requestId=0x...",
            "method": "GET"
          }
        }
      ]
    }
  ],
  "fees": {
    "gas": {
      "currency": { "chainId": 1, "address": "0x...", "symbol": "ETH", "name": "Ether", "decimals": 18 },
      "amount": "500000000000000",
      "amountFormatted": "0.0005",
      "amountUsd": "1.50"
    },
    "relayer": { "amount": "...", "amountFormatted": "...", "amountUsd": "..." },
    "relayerGas": { "amount": "...", "amountFormatted": "...", "amountUsd": "..." },
    "relayerService": { "amount": "...", "amountFormatted": "...", "amountUsd": "..." },
    "app": { "amount": "...", "amountFormatted": "...", "amountUsd": "..." }
  },
  "details": {
    "operation": "bridge",
    "sender": "0x...",
    "recipient": "0x...",
    "currencyIn": {
      "currency": { "chainId": 1, "address": "0x...", "symbol": "ETH", "decimals": 18 },
      "amount": "10000000000000000",
      "amountFormatted": "0.01",
      "amountUsd": "30.00"
    },
    "currencyOut": {
      "currency": { "chainId": 8453, "address": "0x...", "symbol": "ETH", "decimals": 18 },
      "amount": "9950000000000000",
      "amountFormatted": "0.00995",
      "amountUsd": "29.85"
    },
    "totalImpact": { "usd": "0.15", "percent": "0.50" },
    "swapImpact": { "usd": "0.00", "percent": "0.00" },
    "rate": "0.995",
    "timeEstimate": 3,
    "userBalance": "50000000000000000"
  },
  "protocol": {
    "v2": {
      "orderId": "0x...",
      "orderData": "0x...",
      "paymentDetails": {
        "chainId": 1,
        "depository": "0x...",
        "currency": "0x...",
        "amount": "10000000000000000"
      }
    }
  }
}
```

### Errors

| Code | Description |
|------|-------------|
| 400 | Bad request — includes `errorCode` and `errorData` |
| 401 | Unauthorized — missing or invalid API key |
| 429 | Rate limited |
| 500 | Server error |

---

## GET /intents/status/v3

Check the status of a bridge/swap request.

**Query params:** `requestId` (string, required)

**Response:**
```json
{
  "status": "success",
  "details": "Order filled",
  "inTxHashes": ["0x..."],
  "txHashes": ["0x..."],
  "updatedAt": 1713290386145,
  "originChainId": 1,
  "destinationChainId": 8453
}
```

**Status values:**
| Status | Description |
|--------|-------------|
| `waiting` | Order created, awaiting deposit |
| `depositing` | Deposit detected, awaiting confirmation |
| `pending` | Deposit confirmed, awaiting fill |
| `submitted` | Fill transaction submitted |
| `success` | Order completed |
| `delayed` | Fill taking longer than expected |
| `refunded` | Funds returned to user |
| `failure` | Order failed |
| `refund` | Refund in progress |

---

## POST /execute

Gasless execution. **Requires API key.**

**Headers:** `x-api-key: YOUR_KEY`

**Request:**
```json
{
  "executionKind": "rawCalls",
  "data": {
    "chainId": 8453,
    "to": "0x...",
    "data": "0x...",
    "value": "0",
    "authorizationList": []
  },
  "executionOptions": {
    "referrer": "your-app-id",
    "subsidizeFees": true,
    "requestId": "0x...",
    "destinationChainExecutionData": {}
  }
}
```

**Response:** `{ "message": "Transaction submitted", "requestId": "0x..." }`

---

## GET /requests/v2

Get request history.

**Query params (all optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Default 20, max 50 |
| `continuation` | string | Pagination token |
| `user` | string | Filter by user address |
| `hash` | string | Filter by tx hash |
| `originChainId` | number | Source chain |
| `destinationChainId` | number | Destination chain |
| `id` | string | Request ID |
| `orderId` | string | Order ID |
| `status` | enum | `success`, `failure`, `refund`, `pending`, `depositing` |
| `startTimestamp` | number | Start of time range |
| `endTimestamp` | number | End of time range |
| `startBlock` | number | Start block |
| `endBlock` | number | End block |
| `chainId` | string | All requests for a chain (either direction) |
| `referrer` | string | Filter by referrer |
| `depositAddress` | string | Filter by deposit address |
| `includeChildRequests` | boolean | Include duplicates, retries, refunds |
| `includeOrderData` | boolean | Include order metadata |
| `apiKey` | string | Filter by API key |
| `sortBy` | enum | `createdAt` (default), `updatedAt` |
| `sortDirection` | enum | `asc`, `desc` |

**Response:**
```json
{
  "requests": [
    {
      "id": "0x...",
      "status": "success",
      "user": "0x...",
      "recipient": "0x...",
      "data": {
        "fees": { "gas": "...", "relayer": "..." },
        "feesUsd": "1.50",
        "inTxs": [{ "hash": "0x...", "chainId": 1 }],
        "outTxs": [{ "hash": "0x...", "chainId": 8453 }],
        "metadata": {}
      },
      "createdAt": "2024-04-16T12:00:00Z",
      "updatedAt": "2024-04-16T12:00:03Z"
    }
  ],
  "continuation": "..."
}
```

---

## GET /chains

Get all supported chains.

**Query params:** `includeChains` (string, optional)

**Response:** Array of chain objects:
```json
[
  {
    "id": 1,
    "name": "ethereum",
    "displayName": "Ethereum",
    "vmType": "evm",
    "httpRpcUrl": "https://...",
    "wsRpcUrl": "wss://...",
    "explorerUrl": "https://etherscan.io",
    "disabled": false,
    "depositEnabled": true,
    "currency": { "chainId": 1, "address": "0x...", "symbol": "ETH", "decimals": 18 },
    "erc20Currencies": [...],
    "solverCurrencies": [...],
    "tokenSupport": "all"
  }
]
```

---

## POST /currencies/v2

Search for tokens/currencies.

**Request body (all optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `defaultList` | boolean | Return default currencies |
| `chainIds` | number[] | Filter by chain IDs |
| `term` | string | Search term (symbol or name) |
| `address` | string | Token contract address |
| `currencyId` | string | Currency ID |
| `tokens` | string[] | Format: `"chainId:address"` |
| `verified` | boolean | Filter verified only |
| `limit` | number | Default 20, max 100 |
| `includeAllChains` | boolean | Include all chains for each currency |
| `useExternalSearch` | boolean | Use 3rd party search |
| `depositAddressOnly` | boolean | Only deposit-address-compatible |

**Response:**
```json
[
  {
    "chainId": 1,
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "symbol": "USDC",
    "name": "USD Coin",
    "decimals": 6,
    "vmType": "evm",
    "metadata": { "logoURI": "https://...", "verified": true, "isNative": false }
  }
]
```

---

## GET /currencies/token/price

Get token price in USD.

**Query params:** `address` (string, required), `chainId` (number, required)

**Response:** `{ "price": 1.0001 }`

---

## GET /chains/liquidity

Get solver liquidity for a chain.

**Query params:** `chainId` (number, required)

**Response:**
```json
{
  "liquidity": [
    {
      "chainId": 8453,
      "currencyId": "usdc",
      "symbol": "USDC",
      "address": "0x...",
      "decimals": 6,
      "balance": "1000000000",
      "amountUsd": "1000.00"
    }
  ]
}
```

---

## GET /swap-sources

Get available DEX sources for a chain.

**Query params:** `chainId` (number, optional)

**Response:** `{ "sources": ["uniswap-v3", "sushiswap", "curve", ...] }`

---

## POST /transactions/index

Trigger backend to fetch traces and detect internal deposits.

**Body:** `{ "chainId": "string", "txHash": "string", "requestId": "string (optional)" }`

**Response:** `{ "message": "string" }`

---

## POST /transactions/single

Trigger indexing of transfers, wraps, unwraps.

**Body:** `{ "requestId": "string", "chainId": "string", "tx": "string" }`

**Response:** `{ "message": "string" }`

---

## POST /transactions/deposit-address/reindex

Reindex a deposit address.

**Body:** `{ "chainId": number, "depositAddress": "string", "sweep": boolean }`

**Response:** `{ "message": "string", "triggeredCurrencies": [...], "checkedCurrencies": number }`

---

## POST /fast-fill

Fast-fill an order. **Requires API key.**

**Headers:** `x-api-key: YOUR_KEY`

**Body:** `{ "requestId": "string", "solverInputCurrencyAmount": "string", "maxFillAmountUsd": number }`

**Response:** `{ "message": "string" }`

---

## POST /execute/permits

Submit a permit signature.

**Query params:** `signature` (string, required)

**Body:** `{ "kind": "eip3009", "requestId": "string", "api": "bridge" }`

**Response:** Returns updated steps with transaction data.

---

## GET /app-fees/{wallet}/balances

Get accumulated app fee balances.

**Path param:** `wallet` (string)

**Response:**
```json
{
  "balances": [
    {
      "currency": { "chainId": 8453, "address": "0x...", "symbol": "USDC" },
      "amount": "5000000",
      "amountFormatted": "5.00",
      "amountUsd": "5.00",
      "minimumAmount": "1000000"
    }
  ]
}
```

---

## POST /app-fees/{wallet}/claim

Claim accumulated app fees.

**Path param:** `wallet` (string)

**Body:** `{ "chainId": number, "currency": "string", "amount": "string", "recipient": "string" }`

**Response:** Returns signature steps for claiming.

---

## Fee Structure

Four fee components:
1. **Execution fees** — Gas on origin/destination + $0.02 flat fee
2. **Swap fees** — Liquidity provider compensation
3. **Relay fees** — Basis points based on volume tier and asset pair
4. **App fees** — Integrator-defined surcharges

**Volume tiers (trailing 30 days):**

| Tier | Same-token bridge | Stablecoin swap | Major swap | Minor swap |
|------|------------------|-----------------|------------|------------|
| <$10M | 0.00% | 0.01% | 0.06% | 0.15% |
| $10M–$100M | 0.00% | 0.0066% | 0.045% | 0.10% |
| $100M–$1B | 0.00% | 0.0033% | 0.03% | 0.05% |

---

## WebSocket

Connect to `wss://ws.relay.link?apiKey=YOUR_KEY`

**Subscribe:**
```json
{"type": "subscribe", "event": "request.status.updated", "filters": {"id": "0x..."}}
```

**Status progression:** `waiting` → `depositing` → `pending` → `submitted` → `success`

---

## Webhooks

Configured per API key. Relay sends POST to your HTTPS endpoint on status changes.

**Payload:**
```json
{
  "event": "request.status.updated",
  "timestamp": 1713290386145,
  "data": {
    "status": "success",
    "inTxHashes": ["0x..."],
    "txHashes": ["0x..."],
    "updatedAt": 1713290386145,
    "originChainId": 1,
    "destinationChainId": 8453,
    "requestId": "0x..."
  }
}
```

**Verification:** HMAC-SHA256 of `${timestamp}.${body}` using API key as secret. Check headers `X-Signature-Timestamp` and `X-Signature-SHA256`.

---

## Refunds

Automatic on failure. Refund amount may be less than deposit (gas costs deducted). If refund can't cover gas, no refund is sent. Test refunds with `"referrer": "debug-force-refund"`.
