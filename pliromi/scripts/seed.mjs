#!/usr/bin/env node
/**
 * Demo seed data — populates store.json with products, sales, agent logs,
 * and org config so the app looks alive from the start.
 *
 * Usage: node scripts/seed.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "..", "data", "store.json");

const now = new Date();
const ago = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();

const store = {
  org: {
    name: "Pliromi Demo Store",
    description: "A multi-chain store powered by OWS, x402, and AI agents",
    walletName: "hackathon",
  },

  inventory: [
    {
      id: "prod-api-access",
      name: "Premium API Access",
      description: "30-day access to our real-time data feed API. Includes 10k requests/day, WebSocket streaming, and priority support.",
      minPrice: 8,
      maxPrice: 15,
      quantity: 50,
      imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop",
    },
    {
      id: "prod-ai-report",
      name: "AI Market Report",
      description: "AI-generated weekly market analysis covering DeFi yields, token flows, and on-chain metrics across 10+ chains.",
      minPrice: 3,
      maxPrice: 5,
      quantity: 100,
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
    },
    {
      id: "prod-nft-pass",
      name: "VIP Membership Pass",
      description: "Lifetime VIP access — early product launches, exclusive Discord, and 20% off all future purchases.",
      minPrice: 20,
      maxPrice: 50,
      quantity: 10,
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop",
    },
    {
      id: "prod-consultation",
      name: "1-on-1 Strategy Session",
      description: "45-minute call with our team to review your DeFi strategy, treasury setup, and yield optimization.",
      minPrice: 25,
      maxPrice: 40,
      quantity: 5,
      imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
    },
  ],

  team: [
    {
      id: "agent-treasurer",
      name: "Treasurer",
      type: "agent",
      role: "Treasury Management",
      policy: { maxTransactionAmount: 500, dailySpendLimit: 500, allowedChains: ["evm", "solana"] },
    },
    {
      id: "agent-seller",
      name: "Seller",
      type: "agent",
      role: "Sales & Haggling",
      policy: { maxTransactionAmount: 100, dailySpendLimit: 100, allowedChains: ["evm", "solana"] },
    },
  ],

  sales: [
    {
      id: "sale-1",
      productId: "prod-api-access",
      price: 12.50,
      chain: "base",
      txHash: "0x7a3f...demo1",
      timestamp: ago(180),
    },
    {
      id: "sale-2",
      productId: "prod-ai-report",
      price: 5.00,
      chain: "base",
      txHash: "0x8b4e...demo2",
      timestamp: ago(120),
    },
    {
      id: "sale-3",
      productId: "prod-api-access",
      price: 10.00,
      chain: "ethereum",
      txHash: "0x9c5f...demo3",
      timestamp: ago(90),
    },
    {
      id: "sale-4",
      productId: "prod-nft-pass",
      price: 45.00,
      chain: "base",
      txHash: "0xad6g...demo4",
      timestamp: ago(60),
    },
    {
      id: "sale-5",
      productId: "prod-ai-report",
      price: 4.00,
      chain: "polygon",
      txHash: "0xbe7h...demo5",
      timestamp: ago(30),
    },
  ],

  agentLogs: [
    { agent: "treasurer", message: "Treasurer agent started. Monitoring treasury across all chains.", timestamp: ago(200) },
    { agent: "treasurer", message: "Checked balances across 11 chains. Total USDC float: $20.00", timestamp: ago(195) },
    { agent: "treasurer", message: "Lulo target (5% of float): $1.00. Current position: $1.04. On target.", timestamp: ago(194) },
    { agent: "treasurer", message: "WARNING: Ethereum has 0.000000 ETH — below minimum for gas.", timestamp: ago(193) },
    { agent: "seller", message: "Customer inquired about Premium API Access. Offered at $15.00 USDC.", timestamp: ago(175) },
    { agent: "seller", message: "Customer negotiated Premium API Access down to $12.50 USDC. Deal accepted.", timestamp: ago(170) },
    { agent: "seller", message: "x402 sale: Premium API Access for $12.50 USDC on base.", timestamp: ago(165) },
    { agent: "treasurer", message: "Treasury report: $20.00 total USDC. Lulo at $1.04 (target: $1.00). All good.", timestamp: ago(130) },
    { agent: "seller", message: "x402 sale: AI Market Report for $5.00 USDC on base.", timestamp: ago(120) },
    { agent: "seller", message: "Customer asked for a discount on API Access. Negotiated to $10.00 from $15.00.", timestamp: ago(95) },
    { agent: "seller", message: "x402 sale: Premium API Access for $10.00 USDC on ethereum.", timestamp: ago(90) },
    { agent: "seller", message: "VIP Membership Pass sold for $45.00 USDC on base. 9 remaining.", timestamp: ago(60) },
    { agent: "treasurer", message: "Checked balances. Base: $20.00 USDC. Solana: $1.80 USDC. Total: $21.80", timestamp: ago(45) },
    { agent: "seller", message: "AI Market Report sold for $4.00 USDC (haggled from $5.00) on polygon.", timestamp: ago(30) },
    { agent: "treasurer", message: "Treasurer run complete. All positions healthy.", timestamp: ago(15) },
  ],

  lulo: {
    balance: 1.04,
    apy: 4.48,
    lastUpdated: ago(15),
  },
};

// Write
fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");

console.log("Seed data written to", STORE_PATH);
console.log(`  - ${store.inventory.length} products`);
console.log(`  - ${store.team.length} team members`);
console.log(`  - ${store.sales.length} sales`);
console.log(`  - ${store.agentLogs.length} agent logs`);
console.log(`  - Lulo position: $${store.lulo.balance} @ ${store.lulo.apy}% APY`);
console.log("\nRestart the dev server to pick up the changes.");
