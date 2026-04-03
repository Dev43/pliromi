import { signAndSend } from "@open-wallet-standard/core";
import { getWalletAccounts } from "@/lib/wallet";
import { addAgentLog, updateStore } from "@/lib/db";
import { postToGroup } from "@/lib/xmtp-agent";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

export async function POST() {
  try {
    const accounts = await getWalletAccounts();
    const solanaAddr = accounts.find((a) => a.chainId.includes("solana"))?.address;

    if (!solanaAddr) {
      return Response.json({ error: "No Solana address found" }, { status: 400 });
    }

    const luloHeaders = {
      "x-api-key": process.env.LULO_API_KEY || "",
      "Content-Type": "application/json",
    };

    // Get current balance
    const accountRes = await fetch(
      `https://api.lulo.fi/v1/account.getAccount?owner=${solanaAddr}`,
      { headers: luloHeaders }
    );

    if (!accountRes.ok) {
      return Response.json({ error: "Failed to fetch Lulo account" }, { status: 500 });
    }

    const accountData = await accountRes.json();
    const protectedBalance = accountData?.pusdUsdBalance || 0;

    if (protectedBalance <= 0) {
      return Response.json({ error: "No balance to withdraw" }, { status: 400 });
    }

    addAgentLog("treasurer", `Withdrawing $${protectedBalance.toFixed(2)} USDC from Lulo Protected Vault...`);

    // Generate withdraw transaction
    const withdrawRes = await fetch("https://api.lulo.fi/v1/generate.transactions.withdrawProtected", {
      method: "POST",
      headers: luloHeaders,
      body: JSON.stringify({
        owner: solanaAddr,
        mintAddress: USDC_MINT,
        amount: protectedBalance,
        referrer: "3Cuk2L5YARBmtP5yMYMa6Duhn7dkhL7DXcsAGx4KVRUm",
      }),
    });

    if (!withdrawRes.ok) {
      const err = await withdrawRes.text();
      return Response.json({ error: `Lulo withdraw failed: ${err}` }, { status: 500 });
    }

    const withdrawData = await withdrawRes.json();
    const txBase64 = withdrawData.transaction;

    if (!txBase64) {
      return Response.json({ error: "Lulo returned no transaction data" }, { status: 500 });
    }

    const txHex = Buffer.from(txBase64, "base64").toString("hex");
    const result = signAndSend("hackathon", "solana", txHex, undefined, undefined, SOLANA_RPC);

    updateStore((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s as any).lulo = { balance: 0, apy: (s as any).lulo?.apy || 4.5, lastUpdated: new Date().toISOString() };
    });

    const msg = `Lulo withdrawal successful! $${protectedBalance.toFixed(2)} USDC returned to Solana wallet. Tx: ${result.txHash}`;
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => {});

    return Response.json({ success: true, txHash: result.txHash, amount: protectedBalance });
  } catch (error) {
    const msg = `Lulo withdrawal failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => {});
    return Response.json({ error: msg }, { status: 500 });
  }
}
