---
name: ows
description: Secure, local-first multi-chain wallet management — create wallets, derive addresses, sign messages and transactions across EVM, Solana, XRPL, Sui, Bitcoin, Cosmos, Tron, TON, Spark, and Filecoin via CLI, Node.js, or Python.
---

# OWS — Open Wallet Standard

Secure, offline-first multi-chain wallet management. Private keys are encrypted at rest (AES-256-GCM, scrypt KDF) and decrypted only after policy checks pass, then immediately wiped from memory — the caller never sees the raw key.

Available as **CLI**, **Node.js SDK** (`@open-wallet-standard/core`), and **Python SDK** (`open-wallet-standard`).

## When to use

Use this skill when the user asks to:

- Create, import, list, delete, or manage crypto wallets
- Derive blockchain addresses from a mnemonic
- Sign messages or transactions for EVM, Solana, XRPL, Sui, Bitcoin, Cosmos, Tron, TON, Spark, or Filecoin
- Broadcast signed transactions to a chain
- Generate BIP-39 mnemonic phrases
- Fund a wallet with USDC (MoonPay) or check token balances
- Make paid requests to x402-enabled API endpoints or discover x402 services
- Create and manage policies for API key access control
- Create, list, or revoke API keys for agent access to wallets
- Work with `@open-wallet-standard/core` or `open-wallet-standard` in code

## Supported Chains

| Chain | Parameter | Curve | Address Format |
|-------|-----------|-------|----------------|
| EVM (Ethereum, Polygon, Base, etc.) | `evm` | secp256k1 | EIP-55 checksummed |
| Solana | `solana` | Ed25519 | base58 |
| Bitcoin | `bitcoin` | secp256k1 | BIP-84 bech32 |
| Cosmos | `cosmos` | secp256k1 | bech32 |
| Tron | `tron` | secp256k1 | base58check |
| TON | `ton` | Ed25519 | raw/bounceable |
| Sui | `sui` | Ed25519 | 0x + BLAKE2b-256 hex |
| Spark (Bitcoin L2) | `spark` | secp256k1 | spark: prefixed |
| XRPL | `xrpl` | secp256k1 | Base58Check (`r...`) |
| Filecoin | `filecoin` | secp256k1 | f1 secp256k1 |

## Installation

```bash
# CLI (one-liner)
curl -fsSL https://docs.openwallet.sh/install.sh | bash

# Node.js SDK (global install also provides the ows CLI)
npm install @open-wallet-standard/core

# Python SDK
pip install open-wallet-standard
```

---

## CLI

### Wallet Management

```bash
ows wallet create --name "my-wallet"
ows wallet create --name "my-wallet" --words 24 --show-mnemonic
echo "goose puzzle decorate ..." | ows wallet import --name "imported" --mnemonic
echo "4c0883a691..." | ows wallet import --name "from-evm" --private-key
ows wallet list
ows wallet info
ows wallet export --wallet "my-wallet"
ows wallet delete --wallet "my-wallet" --confirm
ows wallet rename --wallet "my-wallet" --new-name "treasury"
```

### Signing

```bash
ows sign message --wallet "my-wallet" --chain evm --message "hello world"
ows sign tx --wallet "my-wallet" --chain evm --tx "02f8..."
ows sign send-tx --wallet "my-wallet" --chain evm --tx "02f8..." --rpc-url "https://..."
```

### Funding

```bash
ows fund deposit --wallet "my-wallet" --chain base --token USDC
ows fund balance --wallet "my-wallet" --chain base
```

### Payments (x402)

```bash
ows pay request https://api.example.com/data --wallet "my-wallet"
ows pay discover
```

### Policies

```bash
ows policy create --file policy.json
ows policy list
ows policy show --id "policy-id"
ows policy delete --id "policy-id" --confirm
```

### API Keys

```bash
ows key create --name "claude-agent" --wallet "my-wallet" --policy "policy-id"
ows key list
ows key revoke --id "key-id" --confirm
```

---

## Node.js SDK

`npm install @open-wallet-standard/core`

For full Node.js API reference, types, and examples see: `~/.claude/skills/ows/references/node.md`

### Quick Reference

```javascript
import { createWallet, signMessage, signTransaction, signAndSend, getWallet, listWallets } from "@open-wallet-standard/core";

const wallet = createWallet("my-wallet");
const sig = signMessage("my-wallet", "evm", "hello world");
const txSig = signTransaction("my-wallet", "evm", "02f8...");
const result = signAndSend("my-wallet", "evm", "02f8...", undefined, undefined, "https://rpc...");
```

---

## Python SDK

`pip install open-wallet-standard`

For full Python API reference, return types, and examples see: `~/.claude/skills/ows/references/python.md`

### Quick Reference

```python
from open_wallet_standard import create_wallet, sign_message, sign_transaction, sign_and_send

wallet = create_wallet("my-wallet")
sig = sign_message("my-wallet", "evm", "hello world")
result = sign_and_send("my-wallet", "evm", "02f8...", rpc_url="https://rpc...")
```

---

## Vault Layout

```
~/.ows/
  bin/ows
  wallets/<uuid>/wallet.json + meta.json
  policies/<id>.json
  keys/<id>.json
```

## Security Model

- Keys encrypted at rest with AES-256-GCM (scrypt N=2^16, r=8, p=1)
- Keys decrypted only after policy checks pass, then immediately wiped
- Caller never sees raw private key during signing
- Single mnemonic derives addresses for all supported chains via BIP-44 HD paths
