import { addAgentLog, readStore, updateStore } from "@/lib/db";
import { getBalances, getWalletInfo } from "@/lib/wallet";
import { postToGroup } from "@/lib/xmtp-agent";
import { signAndSend } from "@open-wallet-standard/core";
import { getRelayQuote } from "@/lib/relay";
import { ethers } from "ethers";

const DEFAULT_INTERVAL = 300_000; // 5 minutes
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function depositToLulo(solanaAddress: string, amountUsdc: number): Promise<boolean> {
  try {
    addAgentLog("treasurer", `Generating Lulo deposit tx for $${amountUsdc.toFixed(2)} USDC...`);

    const res = await fetch("https://api.lulo.fi/v1/generate.transactions.deposit", {
      method: "POST",
      headers: {
        "x-api-key": process.env.LULO_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: solanaAddress,
        mintAddress: USDC_MINT,
        regularAmount: 0,
        protectedAmount: amountUsdc,
        referrer: "3Cuk2L5YARBmtP5yMYMa6Duhn7dkhL7DXcsAGx4KVRUm",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      const msg = `Lulo deposit tx generation failed: ${err}`;
      addAgentLog("treasurer", msg);
      postToGroup("Treasurer", msg).catch(() => { });
      return false;
    }

    const data = await res.json();
    const txBase64 = data.transaction;

    if (!txBase64) {
      const msg = "Lulo returned no transaction data";
      addAgentLog("treasurer", msg);
      postToGroup("Treasurer", msg).catch(() => { });
      return false;
    }

    // Sign and send immediately — don't modify the tx, just convert and broadcast fast
    // OWS signAndSend will sign the message portion (which includes blockhash) and submit
    if (data.simulateError) {
      const simErr = typeof data.simulateError === "string" ? data.simulateError : JSON.stringify(data.simulateError);
      addAgentLog("treasurer", `Lulo simulation warning: ${simErr} — attempting broadcast anyway...`);
    }

    const txHex = Buffer.from(txBase64, "base64").toString("hex");

    addAgentLog("treasurer", "Signing and broadcasting Lulo deposit tx via OWS...");
    const result = signAndSend(
      "hackathon",
      "solana",
      txHex,
      undefined,
      undefined,
      SOLANA_RPC
    );

    // Update stored Lulo balance
    updateStore((store) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (store as any).lulo?.balance || 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any).lulo = {
        balance: current + amountUsdc,
        apy: 8.2,
        lastUpdated: new Date().toISOString(),
      };
    });

    const successMsg = `Lulo deposit successful! Tx: ${result.txHash}`;
    addAgentLog("treasurer", successMsg);
    postToGroup("Treasurer", successMsg).catch(() => { });
    return true;
  } catch (error) {
    const msg = `Lulo deposit failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => { });
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

  // Step 3: Check Lulo position + APY via API
  let luloPosition = 0;
  let luloApy = 4.5;
  const solanaAddr = accounts.find((a) => a.chainName === "Solana")?.address;
  if (solanaAddr) {
    try {
      const luloHeaders = { "x-api-key": process.env.LULO_API_KEY || "", "Content-Type": "application/json" };
      const [accountRes, ratesRes] = await Promise.all([
        fetch(`https://api.lulo.fi/v1/account.getAccount?owner=${solanaAddr}`, { headers: luloHeaders }),
        fetch("https://api.lulo.fi/v1/rates.getRates", { headers: luloHeaders }),
      ]);

      if (accountRes.ok) {
        const luloData = await accountRes.json();
        luloPosition = luloData?.pusdUsdBalance || luloData?.totalUsdValue || 0;
      }

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        luloApy = ratesData?.protected?.CURRENT || ratesData?.protected?.["24HR"] || 4.5;
      }

      // Update local store with live data
      updateStore((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s as any).lulo = { balance: luloPosition, apy: luloApy, lastUpdated: new Date().toISOString() };
      });
    } catch {
      // Fallback to stored balance
      const storeData = readStore();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      luloPosition = (storeData as any).lulo?.balance || 0;
    }
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
      // postToGroup("Treasurer", gasMsg).catch(() => {});
    }
  }

  // Step 5: Determine if Lulo deposit is needed
  const LULO_MIN_DEPOSIT = 1.0; // Lulo requires minimum $1 deposit
  const rawDeficit = luloTarget - luloPosition;
  // Ensure we deposit at least the minimum
  const deficit = Math.max(rawDeficit, rawDeficit > 0.01 ? LULO_MIN_DEPOSIT : 0);

  if (deficit >= LULO_MIN_DEPOSIT) {
    addAgentLog(
      "treasurer",
      `Lulo is under target by $${rawDeficit.toFixed(2)}. Will deposit $${deficit.toFixed(2)} (minimum $${LULO_MIN_DEPOSIT}).`
    );

    const solanaAccount = accounts.find((a) => a.chainName === "Solana");
    const solanaUsdc = solanaAccount?.usdcBalance;
    const solanaAddress = solanaAccount?.address;

    const solNative = parseFloat(solanaAccount?.nativeBalance || "0");
    const solUsdcBal = parseFloat(solanaUsdc || "0");
    const hasEnoughSolanaUsdc = solUsdcBal >= deficit;
    const hasEnoughSolGas = solNative >= 0.01;

    if (hasEnoughSolanaUsdc && hasEnoughSolGas && solanaAddress) {
      // Path A: Solana has enough USDC + gas → deposit directly to Lulo
      addAgentLog("treasurer", `Solana has $${solUsdcBal.toFixed(2)} USDC and ${solNative.toFixed(4)} SOL. Depositing $${deficit.toFixed(2)} to Lulo Protected Vault...`);
      await depositToLulo(solanaAddress, deficit);

    } else if (hasEnoughSolanaUsdc && !hasEnoughSolGas && solanaAddress) {
      // Path B: Has USDC but no gas
      const msg = `Cannot deposit to Lulo: Solana has $${solUsdcBal.toFixed(2)} USDC but only ${solNative.toFixed(6)} SOL — not enough for gas (need 0.01 SOL). Please fund SOL to ${solanaAddress}.`;
      addAgentLog("treasurer", msg);
      postToGroup("Treasurer", msg).catch(() => { });

    } else {
      // Path C: Not enough USDC on Solana → bridge from EVM chain
      addAgentLog("treasurer", `Solana only has $${solUsdcBal.toFixed(2)} USDC (need $${deficit.toFixed(2)}). Looking for EVM chain to bridge from...`);

      const evmSource = accounts.find((a) => {
        if (a.chainName === "Solana") return false;
        const usdc = parseFloat(a.usdcBalance || "0");
        const native = parseFloat(a.nativeBalance || "0");
        const minGas = MIN_GAS[a.chainName] || 0.0005;
        return usdc >= deficit && native >= minGas;
      });

      if (evmSource) {
        const bridgeAmount = deficit.toFixed(2);
        addAgentLog("treasurer", `Bridging $${bridgeAmount} USDC from ${evmSource.chainName} to Solana via Relay...`);

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

          // Collect all transaction items across steps (e.g. approve + deposit)
          const txItems: Array<{ stepId: string; data: { to: string; data: string; value: string; chainId: number } }> = [];
          for (const step of quote.steps || []) {
            for (const item of step.items || []) {
              if (step.kind === "transaction" && item.data) {
                txItems.push({ stepId: step.id, data: item.data });
              }
            }
          }

          addAgentLog("treasurer", `Relay bridge: ${txItems.length} transaction(s) to execute (${txItems.map(t => t.stepId).join(" → ")})`);

          // Execute sequentially — wait for each tx to mine before the next
          for (let i = 0; i < txItems.length; i++) {
            const txItem = txItems[i];
            try {
              const rpcUrl = txItem.data.chainId === 8453 ? "https://mainnet.base.org"
                : txItem.data.chainId === 1 ? "https://eth.llamarpc.com"
                  : txItem.data.chainId === 137 ? "https://polygon-rpc.com"
                    : "https://arb1.arbitrum.io/rpc";

              const provider = new ethers.JsonRpcProvider(rpcUrl);

              // Fresh nonce + gas for each tx
              const [nonce, feeData] = await Promise.all([
                provider.getTransactionCount(evmSource.address, "pending"),
                provider.getFeeData(),
              ]);

              const maxFee = (feeData.maxFeePerGas || 1_000_000_000n) * 3n / 2n;
              const maxPriority = (feeData.maxPriorityFeePerGas || 100_000_000n) * 3n / 2n;

              const tx = ethers.Transaction.from({
                type: 2,
                chainId: txItem.data.chainId,
                nonce,
                to: txItem.data.to,
                data: txItem.data.data,
                value: BigInt(txItem.data.value || "0"),
                gasLimit: 300_000n,
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: maxPriority,
              });

              const unsignedRaw = tx.unsignedSerialized.slice(2);
              const result = signAndSend("hackathon", "evm", unsignedRaw, undefined, undefined, rpcUrl);

              addAgentLog("treasurer", `Bridge tx ${i + 1}/${txItems.length} (${txItem.stepId}) submitted: ${result.txHash}`);

              // Wait for tx to be mined before proceeding to next tx
              if (i < txItems.length - 1) {
                addAgentLog("treasurer", `Waiting for tx ${result.txHash} to be mined...`);
                const receipt = await provider.waitForTransaction(result.txHash, 1, 60_000);
                if (!receipt || receipt.status !== 1) {
                  const failMsg = `Bridge tx ${i + 1} failed on-chain. Aborting remaining steps.`;
                  addAgentLog("treasurer", failMsg);
                  postToGroup("Treasurer", failMsg).catch(() => { });
                  break;
                }
                addAgentLog("treasurer", `Tx ${i + 1} confirmed in block ${receipt.blockNumber}. Proceeding to next step...`);
              } else {
                const successMsg = `Bridge complete! Final tx: ${result.txHash}. Lulo deposit will happen on next treasurer run.`;
                addAgentLog("treasurer", successMsg);
                postToGroup("Treasurer", successMsg).catch(() => { });
              }
            } catch (txErr) {
              const txMsg = `Bridge tx ${i + 1} (${txItem.stepId}) failed: ${txErr instanceof Error ? txErr.message : "Unknown error"}`;
              addAgentLog("treasurer", txMsg);
              postToGroup("Treasurer", txMsg).catch(() => { });
              break; // Don't continue with subsequent txs
            }
          }
        } catch (err) {
          const msg = `Relay bridge failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          addAgentLog("treasurer", msg);
          postToGroup("Treasurer", msg).catch(() => { });
        }
      } else {
        const evmBalances = accounts
          .filter((a) => a.chainName !== "Solana")
          .map((a) => `${a.chainName}: $${parseFloat(a.usdcBalance || "0").toFixed(2)} USDC, ${parseFloat(a.nativeBalance || "0").toFixed(4)} ${a.nativeToken}`)
          .join(", ");
        const msg = `Cannot rebalance: Need $${deficit.toFixed(2)} USDC on Solana but only have $${solUsdcBal.toFixed(2)}. No EVM chain has enough USDC + gas to bridge. Balances: ${evmBalances}. Please fund the treasury.`;
        addAgentLog("treasurer", msg);
        postToGroup("Treasurer", msg).catch(() => { });
      }
    }
  } else if (rawDeficit > 0.01) {
    addAgentLog(
      "treasurer",
      `Lulo deficit is $${rawDeficit.toFixed(2)} but below minimum deposit of $${LULO_MIN_DEPOSIT}. Skipping until deficit reaches $${LULO_MIN_DEPOSIT}.`
    );
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
  postToGroup("Treasurer", summary).catch(() => { });

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
