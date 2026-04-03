# Pliromi - Implementation Checklist

## Onboarding
- [x] Organization name + description form
- [x] OWS wallet creation/loading (uses existing "hackathon" wallet)
- [x] Auto-create Treasurer and Seller agents on setup
- [x] Add humans with API key + policy presets (conservative/moderate/unlimited)
- [ ] Choose number of people in org during onboarding (form field missing)

## Admin Dashboard
- [x] 3-column layout (Treasury | Inventory | Chat + Activity)
- [x] Wallet addresses displayed with balances (multi-chain EVM + Solana)
- [x] Inventory management (add/edit/delete, min/max prices, quantity)
- [x] Agent activity log with auto-refresh
- [x] "Run Treasurer" manual trigger button

## Treasury / Wallet
- [x] Show all OWS wallet addresses across chains
- [x] Show USDC balances per EVM chain (Ethereum, Base, Polygon, Arbitrum)
- [x] Show Solana USDC + SOL balance
- [x] Fund addresses page with QR codes and chain selector
- [x] Fund page calls `ows fund deposit` for MoonPay multi-chain deposits
- [x] Copy address to clipboard
- [x] "Only send USDC" warning

## Team Management
- [x] Add human/agent team members
- [x] Policy presets (conservative $100/day, moderate $500/day, unlimited)
- [x] API key creation via OWS SDK
- [x] Revoke API keys
- [x] Team list with status table
- [ ] Update policy on existing members (UI exists but no backend)

## Treasurer Agent
- [x] Balance checking across chains
- [x] Calculate 30% Lulo target
- [x] Read Lulo API balance
- [x] Deposit USDC to Lulo (generate tx via Lulo API, sign with OWS)
- [x] Run on 5-minute interval with setInterval (via instrumentation.ts)
- [x] TREASURER_ENABLED .env flag to disable
- [x] Post updates to XMTP group chat
- [ ] Bridge USDC to Solana via MoonPay when needed

## Seller Agent
- [x] Haggling logic (negotiates between min/max price)
- [x] Never goes below minimum price
- [x] Returns x402 payment instructions
- [x] Logs sales activity
- [x] Claude/Anthropic SDK for natural conversation
- [x] Post updates to XMTP group chat
- [x] Sales post to XMTP on completion

## x402 / MPP Payments
- [x] HTTP 402 response with x402 headers (address, chain, amount, currency)
- [x] Payment modal with chain selector
- [x] Transaction hash submission
- [x] Inventory decrement on sale
- [x] Sale recording
- [x] On-chain EVM transaction verification (checks receipt, USDC transfer, amount, recipient)

## XMTP Integration
- [x] Browser SDK installed and configured
- [x] Connect wallet via MetaMask/Rabby
- [x] Create group conversation
- [x] Send and receive messages
- [x] Real-time message streaming
- [x] Group ID stored in backend
- [x] Server-side XMTP agent client (posts to group via private key)
- [x] Treasurer posts summaries to XMTP group
- [x] Seller posts negotiations/sales to XMTP group
- [ ] Add members to group by address

## Public Storefront
- [x] Product grid with cards
- [x] Product detail page with haggling chat (/store/product/[id])
- [x] Buy flow with payment modal
- [x] Accepts USDC via x402
- [x] WebMCP server at /api/mcp (list_products, get_product, buy_product, confirm_purchase, negotiate_price)

## Laso Finance Debit Card
- [ ] Page to create prepaid debit cards
- [ ] x402 payment for card creation
- [ ] Store card details securely
- [ ] Multiple cards per agent/human

## Stretch Goals
- [ ] MoonPay commerce Shopify browsing
- [ ] MoonPay bridging in treasurer
- [ ] Real-time balance polling

---

## Status: HIGH + MEDIUM priority ALL DONE

### COMPLETED
1. ~~Treasurer agent: .env flag + interval loop~~ DONE
2. ~~Seller agent: Anthropic SDK for natural haggling~~ DONE
3. ~~XMTP: agents post activity to group chat~~ DONE
4. ~~WebMCP server on storefront~~ DONE
5. ~~On-chain tx verification for x402~~ DONE
6. ~~Lulo deposit execution~~ DONE
7. ~~Fund page: `ows fund deposit` integration~~ DONE
8. ~~Product detail page with haggling chat~~ DONE
9. ~~Solana balance fetching~~ DONE

### REMAINING (low priority)
- Laso debit cards
- MoonPay bridging in treasurer
- XMTP add members by address
- Org people count in onboarding
- Policy update for existing members
