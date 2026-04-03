import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const body = await request.json();
  const { fromChain, fromToken, fromAmount, toWallet, toChain, toToken } = body;

  if (!fromChain || !fromAmount || !toChain) {
    return Response.json({ error: "fromChain, fromAmount, and toChain are required" }, { status: 400 });
  }

  try {
    // Build the bridge command
    const args = [
      `--from-wallet pliromi`,
      `--from-chain ${fromChain}`,
      fromToken ? `--from-token ${fromToken}` : "",
      `--from-amount ${fromAmount}`,
      toWallet ? `--to-wallet ${toWallet}` : "",
      `--to-chain ${toChain}`,
      toToken ? `--to-token ${toToken}` : "",
    ].filter(Boolean).join(" ");

    const { stdout, stderr } = await execAsync(
      `npx mp token bridge ${args}`,
      { timeout: 30000 }
    );

    return Response.json({
      success: true,
      output: (stdout || stderr).trim(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Bridge failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
