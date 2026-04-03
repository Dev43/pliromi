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

  // Step 2: Calculate target for Lulo (30%)
  const luloTarget = totalUsdc * 0.3;
  addAgentLog(
    "treasurer",
    `Lulo target (30% of float): $${luloTarget.toFixed(2)}`
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

  // Step 4: Determine if deposit is needed
  const deficit = luloTarget - luloPosition;
  if (deficit > 1) {
    addAgentLog(
      "treasurer",
      `Lulo is under target by $${deficit.toFixed(2)}. Would need to deposit more USDC to Solana/Lulo.`
    );

    const solanaAccount = accounts.find((a) => a.chainName === "Solana");
    const solanaUsdc = solanaAccount?.usdcBalance;
    const solanaAddress = solanaAccount?.address;

    if (parseFloat(solanaUsdc || "0") < deficit) {
      // Find an EVM chain with enough USDC to bridge
      const evmSource = accounts.find(
        (a) => a.chainName !== "Solana" && parseFloat(a.usdcBalance || "0") >= deficit
      );

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
        const msg = `Insufficient funds: Only $${solanaUsdc || "0"} USDC on Solana, need $${deficit.toFixed(2)}. No EVM chain has enough USDC to bridge. Please fund the treasury.`;
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
      `Lulo position is at or above 30% target. No action needed.`
    );
  }

  addAgentLog("treasurer", "Treasurer run complete.");

  // Post summary to XMTP group
  const summary = deficit > 1
    ? `Treasury report: $${totalUsdc.toFixed(2)} total USDC. Lulo at $${luloPosition.toFixed(2)} (target: $${luloTarget.toFixed(2)}). Deficit: $${deficit.toFixed(2)} - action needed.`
    : `Treasury report: $${totalUsdc.toFixed(2)} total USDC. Lulo position on target at 30%. All good.`;
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

// Export for manual triggering via API
export { runTreasurer };
