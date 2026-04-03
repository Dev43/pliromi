# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pliromi ("payment" in Greek) is a store and treasury management system using the Open Wallet Standard (OWS) and x402/MPP for payments. It enables store owners to manage multi-chain treasury, inventory, and AI agents (Treasurer & Seller) through a Next.js web app. The public storefront is a WebMCP server, allowing any AI agent (browser or CLI) to browse, negotiate, and purchase products programmatically.

## Commands

All commands run from `pliromi/` directory:

```bash
cd pliromi
npm run dev      # Dev server on localhost:3000 (Turbopack)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

### Next.js App (pliromi/)

**Next.js 16 with App Router** — uses route groups for layout separation:

- `app/(admin)/` — Admin dashboard, team management, fund addresses, debit cards, commerce, onboarding
- `app/(store)/` — Public-facing storefront with WebMCP integration
- `app/api/` — All backend logic (REST endpoints)
- `app/.well-known/mcp.json/` — WebMCP discovery endpoint

### Admin Pages

- `/dashboard` — Treasury balances, inventory, allocation chart, activity log
- `/team` — Team management with policy editor, daily spend tracking
- `/fund` — Fund addresses with deposit QR codes
- `/debit-card` — Laso Finance prepaid debit cards
- `/commerce` — MoonPay Commerce Shopify browser
- `/onboarding` — Standalone org setup (outside admin layout, no nav)

### Key Subsystems

**Wallet (`lib/wallet.ts`):** OWS integration for wallet "hackathon". Multi-chain support (Ethereum, Base, Polygon, Arbitrum, Solana, Bitcoin, Cosmos, Tron, TON, Sui, Filecoin). Cached providers with `staticNetwork` to avoid repeated `getNetwork()` calls. 60-second in-memory balance cache. Solana RPC fallback chain.

**Storage (`lib/db.ts`):** JSON file-based database at `data/store.json` with in-memory cache and disk mtime detection (re-reads if file modified externally). Stores org config, inventory, team members, sales, agent logs, Lulo position, and Laso cards.

**Agents (`lib/agents/`):**
- **Treasurer (`lib/agents/treasurer.ts`)** — Runs on 5-minute interval (configurable via `TREASURER_INTERVAL_MS`, disable via `TREASURER_ENABLED=false`). Monitors USDC float, targets `LULO_ALLOCATION_PCT`% (default 1%) in Lulo yield farming on Solana. Bridges via Relay when needed. Checks gas balances. Posts reports to XMTP group.
- **Seller (`lib/agents/seller.ts`)** — Claude-powered (claude-sonnet-4-6) haggling agent. Starts at max price, negotiates down, never below min. Extracts the **last** `$X USDC` mention as the agreed price. Includes `?price=` in x402 URLs for negotiated deals.

**Payment (`app/api/x402/[productId]/`):** Implements x402 protocol. GET returns 402 with payment requirements (accepts `?price=` query param for negotiated prices). Supports X-PAYMENT header for direct agent payment flow. POST for manual browser-based verification.

**Messaging:**
- `components/XmtpChat.tsx` — XMTP group chat with slash commands (`/treasurer`, `/seller`), optimistic message rendering
- `components/ChatWidgetLoader.tsx` — Global chat widget, hidden on `/store` routes (store has its own seller chat)

**WebMCP (`app/(store)/store/page.tsx`, `app/(store)/store/mcp/`):**
- **Imperative API** — `navigator.modelContext.registerTool()` registers `list_products`, `get_payment_link`, `negotiate_price` tools for Chrome 146+ browser agents
- **Declarative API** — Each ProductCard has hidden `<form toolname="buy_...">` annotations
- **Server-side MCP** — `/store/mcp` and `/api/mcp` serve MCP protocol (Streamable HTTP transport) with the same tools
- **Discovery** — `/.well-known/mcp.json` points to `/store/mcp`
- Type declarations in `webmcp.d.ts`

**Relay Bridge (`lib/relay.ts`):** Cross-chain USDC bridging via Relay API. Supports EVM chains + Solana.

**MoonPay Integration:**
- Deposit (`app/api/wallet/fund/`) — `mp deposit create` for multi-chain deposit addresses with auto-conversion to USDC
- Commerce (`app/api/commerce/`) — Shopify store browsing, cart management, Solana Pay checkout via `mp commerce` CLI

**Laso Finance (`app/api/laso/`):** Prepaid debit cards ordered via `ows pay request` to `laso.finance/get-card`. Cards stored in `store.json`.

### Data Flow

1. Onboarding creates org → initializes OWS wallet → creates Treasurer/Seller agents with configurable policies
2. Admin dashboard displays treasury balances (cached ethers.js RPC), inventory, allocation pie chart, agent logs, XMTP chat
3. Public store shows products → customers haggle via seller chat → pay via x402 at negotiated price → inventory updates
4. Treasurer agent periodically checks float, bridges funds, deposits to Lulo
5. AI agents discover store via WebMCP (browser) or MCP server (CLI), browse/negotiate/purchase programmatically

## Environment

Requires `.env` at project root with:
- `LOCUS_PRIVATE_KEY` — OWS wallet private key
- `LULO_API_KEY` — Lulo Finance API key
- `ANTHROPIC_API_KEY` — Claude API for seller agent
- `INFURA_RPC_API_KEY` — Infura RPC access
- `ETHERSCAN_API_KEY` — Transaction verification
- `LULO_ALLOCATION_PCT` — Treasurer Lulo target percentage (default: 1)
- `TREASURER_ENABLED` — Set to "false" to disable auto-run
- `TREASURER_INTERVAL_MS` — Treasurer run interval (default: 300000)
- `NEXT_PUBLIC_BASE_URL` — Base URL for production (default: http://localhost:3000)

## Important Notes

- **Next.js 16 has breaking changes** from prior versions. Read `node_modules/next/dist/docs/` before making changes. Heed deprecation notices.
- Path alias `@/*` maps to `pliromi/` root.
- `@open-wallet-standard/core` and `ethers` are configured as external server packages in `next.config.ts`.
- OWS CLI tool (`ows`) is available for wallet operations (create, derive, fund, sign).
- MoonPay CLI (`mp`) is available for deposits, commerce, and swaps — uses its own wallet system separate from OWS.
- The `data/store.json` file has disk mtime detection — safe to edit manually while the server runs.
- WebMCP requires Chrome 146+ with `chrome://flags/#enable-webmcp-testing` enabled.
