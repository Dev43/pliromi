// Relay bridge API helper
const RELAY_API = "https://api.relay.link";

// Chain IDs for Relay
export const RELAY_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  polygon: 137,
  arbitrum: 42161,
  solana: 792703809,
};

// USDC addresses per chain (0x000...000 = native token)
const NATIVE = "0x0000000000000000000000000000000000000000";
export const RELAY_USDC: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export interface RelayQuote {
  steps: Array<{
    id: string;
    kind: "transaction" | "signature";
    items: Array<{
      data: {
        to: string;
        data: string;
        value: string;
        chainId: number;
        from?: string;
      };
      check: {
        endpoint: string;
        body?: Record<string, unknown>;
      };
    }>;
  }>;
  fees: Record<string, unknown>;
  details: Record<string, unknown>;
}

export async function getRelayQuote(params: {
  user: string;
  fromChain: string;
  toChain: string;
  token: "usdc" | "native";
  amount: string; // in token units (e.g. "10" for 10 USDC)
  recipient?: string;
}): Promise<RelayQuote> {
  const originChainId = RELAY_CHAIN_IDS[params.fromChain];
  const destinationChainId = RELAY_CHAIN_IDS[params.toChain];

  if (!originChainId || !destinationChainId) {
    throw new Error(`Unsupported chain: ${params.fromChain} or ${params.toChain}`);
  }

  let originCurrency: string;
  let destinationCurrency: string;
  let amount: string;

  if (params.token === "usdc") {
    originCurrency = RELAY_USDC[params.fromChain] || NATIVE;
    destinationCurrency = RELAY_USDC[params.toChain] || NATIVE;
    // Convert USDC amount to 6-decimal smallest unit
    amount = String(Math.floor(parseFloat(params.amount) * 1_000_000));
  } else {
    originCurrency = NATIVE;
    destinationCurrency = NATIVE;
    // Convert native amount to wei (18 decimals)
    amount = String(BigInt(Math.floor(parseFloat(params.amount) * 1e18)));
  }

  const body: Record<string, unknown> = {
    user: params.user,
    originChainId,
    destinationChainId,
    originCurrency,
    destinationCurrency,
    amount,
    tradeType: "EXACT_INPUT",
  };

  if (params.recipient) {
    body.recipient = params.recipient;
  }

  const res = await fetch(`${RELAY_API}/quote/v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Relay quote failed: ${err}`);
  }

  return res.json();
}

export async function checkRelayStatus(requestId: string) {
  const res = await fetch(
    `${RELAY_API}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`
  );
  if (!res.ok) {
    throw new Error("Failed to check relay status");
  }
  return res.json();
}
