import { addAgentLog } from "@/lib/db";
import { getBalances, getWalletInfo } from "@/lib/wallet";
import { postToGroup } from "@/lib/xmtp-agent";
import { signAndSend } from "@open-wallet-standard/core";
import { getRelayQuote } from "@/lib/relay";

const DEFAULT_INTERVAL = 300_000; // 5 minutes
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function depositToLulo(solanaAddress: string, amountUsdc: number): Promise<boolean> {
  try {
    // Convert USD amount to USDC lamports (6 decimals)
    const amountLamports = Math.floor(amountUsdc * 1_000_000);

    addAgentLog("treasurer", `Generating Lulo deposit tx for $${amountUsdc.toFixed(2)} USDC...`);

    const res = await fetch("https://dev.lulo.fi/v1/generate.transactions.deposit", {
      method: "POST",
      headers: {
        "x-api-key": process.env.LULO_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: solanaAddress,
        mintAddress: USDC_MINT,
        regularAmount: amountLamports,
        protectedAmount: 0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      const msg = `Lulo deposit tx generation failed: ${err}`;
      addAgentLog("treasurer", msg);
      postToGroup("Treasurer", msg).catch(() => {});
      return false;
    }

    const data = await res.json();
    const txBase64 = data.transaction;

    if (!txBase64) {
      const msg = "Lulo returned no transaction data";
      addAgentLog("treasurer", msg);
      postToGroup("Treasurer", msg).catch(() => {});
      return false;
    }

    // Sign and send via OWS
    addAgentLog("treasurer", "Signing and broadcasting Lulo deposit tx via OWS...");
    const result = signAndSend(
      "hackathon",
      "solana",
      txBase64,
      undefined,
      undefined,
      SOLANA_RPC
    );

    const successMsg = `Lulo deposit successful! Tx: ${result.txHash}`;
    addAgentLog("treasurer", successMsg);
    postToGroup("Treasurer", successMsg).catch(() => {});
    return true;
  } catch (error) {
    const msg = `Lulo deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => {});
    return false;
  }
}

async function runTreasurer(): Promise<{
  totalUsdc: string;
  luloTarget: string;
  luloPosition: string;
}> {
  addAgentLog("treasurer", "Treasurer agent run started");

  // Step 1: Check all balances
  const accounts = await getBalances();
  const totalUsdc = accounts.reduce((sum, acc) => {
    return sum + parseFloat(acc.usdcBalance || "0");
  }, 0);

  addAgentLog(
    "treasurer",
    `Checked balances across ${accounts.length} chains. Total USDC float: $${totalUsdc.toFixed(2)}`
  );

  // Step 2: Calculate target for Lulo (configurable via LULO_ALLOCATION_PCT, default 1%)
  const luloPercent = parseFloat(process.env.LULO_ALLOCATION_PCT || "1") / 100;
  const luloTarget = totalUsdc * luloPercent;
  addAgentLog(
    "treasurer",
    `Lulo target (${(luloPercent * 100).toFixed(0)}% of float): $${luloTarget.toFixed(2)}`
  );

  // Step 3: Check Lulo position
  let luloPosition = 0;
  try {
    const luloRes = await fetch("https://api.lulo.fi/v1/account/balances", {
      headers: {
        "x-api-key": process.env.LULO_API_KEY || "",
      },
    });
    if (luloRes.ok) {
      const luloData = await luloRes.json();
      luloPosition = luloData?.totalBalance || 0;
    }
  } catch {
    const msg = "Could not reach Lulo API - skipping position check";
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => {});
  }

  addAgentLog(
    "treasurer",
    `Current Lulo position: $${luloPosition.toFixed(2)}`
  );

  // Step 4: Check gas balances on all chains
  const MIN_GAS: Record<string, number> = {
    Solana: 0.01,    // SOL
    Base: 0.0005,    // ETH
    Ethereum: 0.001, // ETH
    Polygon: 0.01,   // MATIC
    Arbitrum: 0.0005, // ETH
  };

  for (const acc of accounts) {
    const minGas = MIN_GAS[acc.chainName];
    if (minGas === undefined) continue;
    const nativeBal = parseFloat(acc.nativeBalance || "0");
    if (nativeBal < minGas) {
      const gasMsg = `WARNING: ${acc.chainName} has ${nativeBal.toFixed(6)} ${acc.nativeToken} — below minimum ${minGas} ${acc.nativeToken} needed for gas. Transactions on this chain will fail. Please fund ${acc.address} with ${acc.nativeToken}.`;
      addAgentLog("treasurer", gasMsg);
      postToGroup("Treasurer", gasMsg).catch(() => {});
    }
  }

  // Step 5: Determine if Lulo deposit is needed
  const deficit = luloTarget - luloPosition;
  if (deficit > 0.01) {
    addAgentLog(
      "treasurer",
      `Lulo is under target by $${deficit.toFixed(2)}. Would need to deposit more USDC to Solana/Lulo.`
    );

    const solanaAccount = accounts.find((a) => a.chainName === "Solana");
    const solanaUsdc = solanaAccount?.usdcBalance;
    const solanaAddress = solanaAccount?.address;

    if (parseFloat(solanaUsdc || "0") < deficit) {
      // Find an EVM chain with enough USDC AND enough native gas to bridge
      const evmSource = accounts.find((a) => {
        if (a.chainName === "Solana") return false;
        const usdc = parseFloat(a.usdcBalance || "0");
        const native = parseFloat(a.nativeBalance || "0");
        const minGas = MIN_GAS[a.chainName] || 0.0005;
        return usdc >= deficit && native >= minGas;
      });

      if (evmSource) {
        const bridgeAmount = deficit.toFixed(2);
        addAgentLog(
          "treasurer",
          `Bridging $${bridgeAmount} USDC from ${evmSource.chainName} to Solana via Relay...`
        );

        try {
          const chainKey = evmSource.chainName.toLowerCase();
          const quote = await getRelayQuote({
            user: evmSource.address,
            fromChain: chainKey,
            toChain: "solana",
            token: "usdc",
            amount: bridgeAmount,
            recipient: solanaAddress,
          });

          addAgentLog(
            "treasurer",
            `Relay bridge quote received: ${quote.steps?.length || 0} step(s). Ready to sign and execute.`
          );

          // In production: iterate steps, sign with OWS, submit
          // For hackathon demo: log the quote
          for (const step of quote.steps || []) {
            for (const item of step.items || []) {
              if (step.kind === "transaction" && item.data) {
                addAgentLog(
                  "treasurer",
                  `Bridge tx: ${item.data.to?.slice(0, 10)}... on chain ${item.data.chainId}, value: ${item.data.value}`
                );
              }
            }
          }
        } catch (err) {
          const msg = `Relay bridge failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          addAgentLog("treasurer", msg);
          postToGroup("Treasurer", msg).catch(() => {});
        }
      } else {
        // Explain why we can't bridge
        const evmBalances = accounts
          .filter((a) => a.chainName !== "Solana")
          .map((a) => `${a.chainName}: $${parseFloat(a.usdcBalance || "0").toFixed(2)} USDC, ${parseFloat(a.nativeBalance || "0").toFixed(4)} ${a.nativeToken}`)
          .join(", ");
        const msg = `Cannot rebalance to Lulo: Need $${deficit.toFixed(2)} USDC on Solana but only have $${solanaUsdc || "0"}. No EVM chain has enough USDC + gas to bridge. Chain balances: ${evmBalances}. Please fund the treasury.`;
        addAgentLog("treasurer", msg);
        postToGroup("Treasurer", msg).catch(() => {});
      }
    } else if (solanaAddress) {
      addAgentLog(
        "treasurer",
        `Sufficient USDC on Solana ($${solanaUsdc}). Depositing $${deficit.toFixed(2)} to Lulo...`
      );
      await depositToLulo(solanaAddress, deficit);
    }
  } else {
    addAgentLog(
      "treasurer",
      `Lulo position is at or above ${(luloPercent * 100).toFixed(0)}% target. No action needed.`
    );
  }

  addAgentLog("treasurer", "Treasurer run complete.");

  // Post summary to XMTP group
  const summary = deficit > 0.01
    ? `Treasury report: $${totalUsdc.toFixed(2)} total USDC. Lulo at $${luloPosition.toFixed(2)} (target: $${luloTarget.toFixed(2)}). Deficit: $${deficit.toFixed(2)} - action needed.`
    : `Treasury report: $${totalUsdc.toFixed(2)} total USDC. Lulo position on target at ${(luloPercent * 100).toFixed(0)}%. All good.`;
  postToGroup("Treasurer", summary).catch(() => {});

  return {
    totalUsdc: totalUsdc.toFixed(2),
    luloTarget: luloTarget.toFixed(2),
    luloPosition: luloPosition.toFixed(2),
  };
}

export function startTreasurerLoop() {
  const enabled = process.env.TREASURER_ENABLED !== "false";
  const interval = parseInt(process.env.TREASURER_INTERVAL_MS || "") || DEFAULT_INTERVAL;

  if (!enabled) {
    console.log("[Treasurer] Disabled via TREASURER_ENABLED=false");
    return;
  }

  console.log(`[Treasurer] Starting with ${interval / 1000}s interval`);

  // Run after a short delay to let the server fully start
  setTimeout(() => {
    runTreasurer().catch((err) => {
      console.error("[Treasurer] Initial run error:", err);
    });
  }, 5000);

  setInterval(() => {
    runTreasurer().catch((err) => {
      console.error("[Treasurer] Scheduled run error:", err);
    });
  }, interval);
}

// Claude-powered treasurer chat
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function buildTreasurerSystemPrompt(treasuryData: {
  totalUsdc: string;
  luloTarget: string;
  luloPosition: string;
  accounts?: { chainName: string; usdcBalance?: string; nativeBalance?: string; nativeToken: string }[];
}): string {
  const luloPercent = parseFloat(process.env.LULO_ALLOCATION_PCT || "1");
  const accountLines = (treasuryData.accounts || [])
    .map((a) => `  - ${a.chainName}: ${parseFloat(a.usdcBalance || "0").toFixed(2)} USDC, ${parseFloat(a.nativeBalance || "0").toFixed(4)} ${a.nativeToken}`)
    .join("\n");

  return `You are the Treasurer agent for a Pliromi store. You manage the store's multi-chain treasury.

CURRENT TREASURY STATE:
- Total USDC across all chains: $${treasuryData.totalUsdc}
- Lulo Protected Vault target: ${luloPercent}% of float = $${treasuryData.luloTarget}
- Current Lulo position: $${treasuryData.luloPosition}
- Balances per chain:
${accountLines || "  (loading...)"}

YOUR RESPONSIBILITIES:
1. Monitor USDC balances across all chains (Base, Solana, Ethereum, Polygon, Arbitrum)
2. Ensure ${luloPercent}% of the total USDC float is deposited in Lulo Protected Vault (Solana DeFi) for yield
3. Bridge USDC between chains using Relay protocol when needed
4. Report on treasury health and recommend actions

CAPABILITIES:
- You can run a treasury check anytime (checking all balances and Lulo position)
- You can bridge USDC from EVM chains to Solana via Relay
- You can deposit USDC to Lulo Protected Vault on Solana
- You can send USDC or native tokens to any address

COMMANDS YOU RESPOND TO:
- "status" or "report" — give a full treasury report
- "rebalance" — check if Lulo is under target and take action
- "bridge X USDC from [chain] to [chain]" — explain how you'd bridge
- "deposit X to lulo" — explain the Lulo deposit process
- Any other treasury question — answer helpfully

RULES:
- Always be precise with numbers. Use $ for USD amounts.
- If asked to rebalance, run the check and report what actions are needed.
- If funds are insufficient, clearly explain what's missing and suggest funding the treasury.
- Keep responses concise but informative. You're a professional treasury manager.
- When the user asks you to rebalance, confirm what you will do before executing.`;
}

export async function chatWithTreasurer(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  // Get current treasury state
  let treasuryData: { totalUsdc: string; luloTarget: string; luloPosition: string; accounts?: { chainName: string; usdcBalance?: string; nativeBalance?: string; nativeToken: string }[] };

  try {
    const accounts = await getBalances();
    const totalUsdc = accounts.reduce((sum, acc) => sum + parseFloat(acc.usdcBalance || "0"), 0);
    const luloPercent = parseFloat(process.env.LULO_ALLOCATION_PCT || "1") / 100;
    treasuryData = {
      totalUsdc: totalUsdc.toFixed(2),
      luloTarget: (totalUsdc * luloPercent).toFixed(2),
      luloPosition: "0.00", // Would come from Lulo API
      accounts,
    };
  } catch {
    treasuryData = { totalUsdc: "0.00", luloTarget: "0.00", luloPosition: "0.00" };
  }

  const systemPrompt = buildTreasurerSystemPrompt(treasuryData);

  // Check if user wants to trigger rebalance
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("rebalance") || lowerMsg === "run" || lowerMsg === "execute") {
    try {
      const result = await runTreasurer();
      const actionReport = `I've run a treasury rebalance check.\n\nResults:\n- Total USDC: $${result.totalUsdc}\n- Lulo Target: $${result.luloTarget}\n- Lulo Position: $${result.luloPosition}\n\n`;

      // Still send to Claude for a natural response
      const messages: { role: "user" | "assistant"; content: string }[] = [
        ...(history || []),
        { role: "user" as const, content: `I asked you to rebalance. Here are the results of the rebalance run: ${actionReport}. Now respond to me about what happened and what actions were taken or still needed. Original message: "${message}"` },
      ];

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      });

      return response.content[0].type === "text" ? response.content[0].text : actionReport;
    } catch (err) {
      return `Rebalance failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  }

  // Regular chat
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...(history || []),
    { role: "user" as const, content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "I couldn't process that request.";
    addAgentLog("treasurer", `Chat: "${message.slice(0, 60)}..." → responded`);
    return reply;
  } catch (err) {
    return `I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`;
  }
}

export { runTreasurer };
