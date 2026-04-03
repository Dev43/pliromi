import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Cache to avoid rate limiting
let balanceCache: { data: Record<string, unknown>; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// Only query these chains to reduce API calls
const PRIORITY_CHAINS = ["base", "solana", "ethereum"];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  // Return cached data if fresh
  if (balanceCache && Date.now() - balanceCache.timestamp < CACHE_TTL) {
    return Response.json({ balances: balanceCache.data });
  }

  const body = await request.json();
  const addressMap: Record<string, string> = body.addresses || {};
  const legacyAddress = body.address;
  const legacyChains: string[] = body.chains;

  // Build chain->address map
  const queries: { chain: string; address: string }[] = [];

  if (Object.keys(addressMap).length > 0) {
    // Only query priority chains first, then others if we have headroom
    for (const chain of PRIORITY_CHAINS) {
      if (addressMap[chain]) {
        queries.push({ chain, address: addressMap[chain] });
      }
    }
    // Add remaining chains
    for (const [chain, addr] of Object.entries(addressMap)) {
      if (!PRIORITY_CHAINS.includes(chain)) {
        queries.push({ chain, address: addr });
      }
    }
  } else if (legacyAddress && legacyChains) {
    for (const chain of legacyChains) {
      queries.push({ chain, address: legacyAddress });
    }
  } else {
    return Response.json({ error: "addresses map or address+chains required" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  // Query sequentially with delays to avoid rate limiting
  for (const { chain, address } of queries) {
    try {
      const { stdout } = await execAsync(
        `npx mp --json token balance list --wallet "${address}" --chain ${chain}`,
        { timeout: 10000 }
      );
      try {
        results[chain] = JSON.parse(stdout);
      } catch {
        results[chain] = stdout.trim();
      }
    } catch {
      results[chain] = null;
    }
    // Small delay between requests to avoid rate limiting
    await delay(300);
  }

  // Only cache if we got at least one valid result
  const hasData = Object.values(results).some((v) => v !== null);
  if (hasData) {
    balanceCache = { data: results, timestamp: Date.now() };
  }
  return Response.json({ balances: results });
}
