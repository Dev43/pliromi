import {
  getWallet,
  listWallets,
  createWallet,
  createPolicy,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  listPolicies,
  deletePolicy,
} from "@open-wallet-standard/core";
import { ethers } from "ethers";

const WALLET_NAME = "hackathon";

// USDC contract addresses per chain
const USDC_CONTRACTS: Record<string, { address: string; rpc: string; decimals: number; chainId: number }> = {
  ethereum: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rpc: "https://eth.llamarpc.com",
    decimals: 6,
    chainId: 1,
  },
  base: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpc: "https://mainnet.base.org",
    decimals: 6,
    chainId: 8453,
  },
  polygon: {
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    rpc: "https://polygon-rpc.com",
    decimals: 6,
    chainId: 137,
  },
  arbitrum: {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    rpc: "https://arb1.arbitrum.io/rpc",
    decimals: 6,
    chainId: 42161,
  },
};

// Chain display names and native tokens
const CHAIN_INFO: Record<string, { name: string; nativeToken: string }> = {
  "eip155:1": { name: "Ethereum", nativeToken: "ETH" },
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": { name: "Solana", nativeToken: "SOL" },
  "bip122:000000000019d6689c085ae165831e93": { name: "Bitcoin", nativeToken: "BTC" },
  "cosmos:cosmoshub-4": { name: "Cosmos", nativeToken: "ATOM" },
  "tron:mainnet": { name: "Tron", nativeToken: "TRX" },
  "ton:mainnet": { name: "TON", nativeToken: "TON" },
  "fil:mainnet": { name: "Filecoin", nativeToken: "FIL" },
  "sui:mainnet": { name: "Sui", nativeToken: "SUI" },
};

export interface WalletAccount {
  chainId: string;
  chainName: string;
  nativeToken: string;
  address: string;
  nativeBalance?: string;
  usdcBalance?: string;
}

export function getWalletInfo() {
  try {
    return getWallet(WALLET_NAME);
  } catch {
    return createWallet(WALLET_NAME);
  }
}

export function getAllWallets() {
  return listWallets();
}

export async function getWalletAccounts(): Promise<WalletAccount[]> {
  const wallet = getWalletInfo();
  return wallet.accounts.map((acc: { chainId: string; address: string }) => {
    const info = CHAIN_INFO[acc.chainId] || { name: acc.chainId, nativeToken: "?" };
    return {
      chainId: acc.chainId,
      chainName: info.name,
      nativeToken: info.nativeToken,
      address: acc.address,
    };
  });
}

const providerCache = new Map<string, ethers.JsonRpcProvider>();
const balanceOfIface = new ethers.Interface(["function balanceOf(address) view returns (uint256)"]);

function getProvider(rpcUrl: string, chainId: number): ethers.JsonRpcProvider {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    const network = new ethers.Network("custom", chainId);
    provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
    providerCache.set(rpcUrl, provider);
  }
  return provider;
}

async function getEvmBalance(rpcUrl: string, address: string, chainId: number): Promise<string> {
  const balance = await getProvider(rpcUrl, chainId).getBalance(address);
  return ethers.formatEther(balance);
}

async function getEvmUsdcBalance(
  rpcUrl: string,
  contractAddress: string,
  walletAddress: string,
  decimals: number,
  chainId: number
): Promise<string> {
  const contract = new ethers.Contract(contractAddress, balanceOfIface, getProvider(rpcUrl, chainId));
  const balance = await contract.balanceOf(walletAddress);
  return ethers.formatUnits(balance, decimals);
}

const RPC_TIMEOUT = 3000;
const CACHE_TTL = 30_000; // 30 seconds

let balanceCache: { data: WalletAccount[]; timestamp: number } | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function fetchSolanaBalances(address: string): Promise<{ native: string; usdc: string }> {
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const rpc = "https://api.mainnet-beta.solana.com";

  const [solBalData, tokenData] = await Promise.all([
    fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
    }).then((r) => r.json()),
    fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2, method: "getTokenAccountsByOwner",
        params: [address, { mint: USDC_MINT }, { encoding: "jsonParsed" }],
      }),
    }).then((r) => r.json()),
  ]);

  const native = (Number(solBalData?.result?.value || 0) / 1e9).toFixed(4);
  const tokenAccounts = tokenData?.result?.value || [];
  const usdc = tokenAccounts.length > 0
    ? (tokenAccounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0).toFixed(2)
    : "0";

  return { native, usdc };
}

export async function getBalances(): Promise<WalletAccount[]> {
  if (balanceCache && Date.now() - balanceCache.timestamp < CACHE_TTL) {
    return balanceCache.data;
  }

  const accounts = await getWalletAccounts();
  const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address;
  const solanaAccount = accounts.find((a) => a.chainId.includes("solana"));
  const nonEvmAccounts = accounts.filter(
    (a) => a.chainId !== "eip155:1" && !a.chainId.includes("solana")
  );

  if (!evmAddress) return accounts;

  // Fetch ALL balances in parallel — EVM chains + Solana
  const evmPromises = Object.entries(USDC_CONTRACTS).map(
    async ([chain, config]) => {
      try {
        const [native, usdc] = await Promise.all([
          withTimeout(getEvmBalance(config.rpc, evmAddress, config.chainId), RPC_TIMEOUT),
          withTimeout(getEvmUsdcBalance(config.rpc, config.address, evmAddress, config.decimals, config.chainId), RPC_TIMEOUT),
        ]);
        return { chain, native, usdc };
      } catch {
        return { chain, native: "0", usdc: "0" };
      }
    }
  );

  const solanaPromise = solanaAccount
    ? withTimeout(fetchSolanaBalances(solanaAccount.address), RPC_TIMEOUT).catch(() => ({ native: "0", usdc: "0" }))
    : null;

  const [evmResults, solResult] = await Promise.all([
    Promise.allSettled(evmPromises),
    solanaPromise,
  ]);

  const evmChains = evmResults
    .filter((r): r is PromiseFulfilledResult<{ chain: string; native: string; usdc: string }> => r.status === "fulfilled")
    .map(({ value: { chain, native, usdc } }) => ({
      chainId: `evm:${chain}`,
      chainName: chain.charAt(0).toUpperCase() + chain.slice(1),
      nativeToken: chain === "ethereum" ? "ETH" : chain === "polygon" ? "MATIC" : "ETH",
      address: evmAddress,
      nativeBalance: native,
      usdcBalance: usdc,
    }));

  const enrichedAccounts = [...evmChains, ...nonEvmAccounts];

  if (solanaAccount && solResult) {
    enrichedAccounts.push({
      ...solanaAccount,
      nativeBalance: solResult.native,
      usdcBalance: solResult.usdc,
    });
  }

  balanceCache = { data: enrichedAccounts, timestamp: Date.now() };
  return enrichedAccounts;
}

// Policy & API Key management
export function createTeamPolicy(config: {
  name: string;
  maxSpend?: number;
  dailyLimit?: number;
  chains?: string[];
}) {
  const policy = {
    name: config.name,
    rules: {
      maxTransactionAmount: config.maxSpend || 100,
      dailySpendLimit: config.dailyLimit || 500,
      allowedChains: config.chains || ["evm", "solana"],
    },
  };
  return createPolicy(JSON.stringify(policy));
}

export function createTeamApiKey(
  name: string,
  walletIds: string[],
  policyIds: string[],
  passphrase: string = ""
) {
  return createApiKey(name, walletIds, policyIds, passphrase);
}

export function getApiKeys() {
  return listApiKeys();
}

export function revokeTeamApiKey(id: string) {
  return revokeApiKey(id);
}

export function getPolicies() {
  return listPolicies();
}

export function removePolicy(id: string) {
  return deletePolicy(id);
}
