# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pliromi ("payment" in Greek) is a store and treasury management system using the Open Wallet Standard (OWS) and x402/MPP for payments. It enables store owners to manage multi-chain treasury, inventory, and agents (Treasurer & Seller) through a Next.js web app.

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

- `app/(admin)/` — Admin dashboard, team management, fund addresses, onboarding
- `app/(store)/` — Public-facing storefront
- `app/api/` — All backend logic (REST endpoints)

### Key Subsystems

**Wallet (`lib/wallet.ts`):** OWS integration for wallet "hackathon". Multi-chain support (Ethereum, Base, Polygon, Arbitrum, Solana, Bitcoin, Cosmos, Tron, TON, Sui, Filecoin). Handles account derivation, policy creation, and API key management.

**Storage (`lib/db.ts`):** JSON file-based database at `data/store.json`. Stores org config, inventory, team members, sales, and agent logs. No external database.

**Agents (`app/api/agent/`):**
- **Treasurer** — Monitors total USDC float across chains, targets 30% allocation in Lulo yield farming (Solana). Bridges via MoonPay when needed.
- **Seller** — Handles customer product inquiries, implements price haggling (5-15% reduction, never below min price), provides x402 payment instructions.

**Payment (`app/api/x402/[productId]/`):** Implements HTTP 402 Payment Required protocol. GET returns payment requirements (address, chain, amount), POST verifies transaction and decrements inventory.

**Messaging (`components/XmtpChat.tsx`, `lib/xmtp.ts`):** XMTP group chat for team communication between humans and agents. Requires browser wallet extension (Rabby/MetaMask).

### Data Flow

1. Onboarding creates org → initializes OWS wallet → creates Treasurer/Seller agents with policies
2. Admin dashboard displays treasury balances (fetched via ethers.js RPC), inventory, agent logs, and XMTP chat
3. Public store shows products → customers pay via x402 → inventory updates
4. Treasurer agent periodically checks float and manages Lulo yield position

## Environment

Requires `.env` at project root with: `LOCUS_PRIVATE_KEY`, `LULO_API_KEY`, `ANTHROPIC_API_KEY`, `INFURA_RPC_API_KEY`, `ETHERSCAN_API_KEY`.

## Important Notes

- **Next.js 16 has breaking changes** from prior versions. Read `node_modules/next/dist/docs/` before making changes. Heed deprecation notices.
- Path alias `@/*` maps to `pliromi/` root.
- `@open-wallet-standard/core` and `ethers` are configured as external server packages in `next.config.ts`.
- OWS CLI tool (`ows`) is available for wallet operations (create, derive, fund, sign).
