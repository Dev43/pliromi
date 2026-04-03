import { signAndSend } from "@open-wallet-standard/core";
import { ethers } from "ethers";
import { addAgentLog } from "@/lib/db";

const USDC_CONTRACTS: Record<string, { address: string; decimals: number }> = {
  ethereum: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  base: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  polygon: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
  arbitrum: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
};

const CHAIN_RPCS: Record<string, { rpc: string; chainId: number }> = {
  ethereum: { rpc: "https://eth.llamarpc.com", chainId: 1 },
  base: { rpc: "https://mainnet.base.org", chainId: 8453 },
  polygon: { rpc: "https://polygon-rpc.com", chainId: 137 },
  arbitrum: { rpc: "https://arb1.arbitrum.io/rpc", chainId: 42161 },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { chain, to, amount, token } = body;

  if (!chain || !to || !amount) {
    return Response.json({ error: "chain, to, and amount are required" }, { status: 400 });
  }

  try {
    const chainConfig = CHAIN_RPCS[chain];
    if (!chainConfig) {
      return Response.json({ error: `Unsupported chain: ${chain}` }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const from = "0x793dd118B0f8f22cfe52eD8A152d4677CFB571D3"; // hackathon wallet EVM address

    if (token === "usdc") {
      // ERC-20 USDC transfer
      const usdc = USDC_CONTRACTS[chain];
      if (!usdc) {
        return Response.json({ error: `No USDC on ${chain}` }, { status: 400 });
      }

      const iface = new ethers.Interface(["function transfer(address to, uint256 amount)"]);
      const amountWei = ethers.parseUnits(amount, usdc.decimals);
      const data = iface.encodeFunctionData("transfer", [to, amountWei]);

      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(from, "pending"),
        provider.getFeeData(),
      ]);

      const tx = ethers.Transaction.from({
        type: 2,
        chainId: chainConfig.chainId,
        nonce,
        to: usdc.address,
        value: 0n,
        data,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: 100_000n,
      });

      const unsignedRaw = tx.unsignedSerialized.slice(2);
      const result = signAndSend("hackathon", "evm", unsignedRaw, undefined, undefined, chainConfig.rpc);

      addAgentLog("treasurer", `Sent ${amount} USDC to ${to} on ${chain}. Tx: ${result.txHash}`);
      return Response.json({ success: true, txHash: result.txHash });
    } else {
      // Native token transfer
      const [nonce, feeData] = await Promise.all([
        provider.getTransactionCount(from, "pending"),
        provider.getFeeData(),
      ]);

      const tx = ethers.Transaction.from({
        type: 2,
        chainId: chainConfig.chainId,
        nonce,
        to,
        value: ethers.parseEther(amount),
        data: "0x",
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: 21_000n,
      });

      const unsignedRaw = tx.unsignedSerialized.slice(2);
      const result = signAndSend("hackathon", "evm", unsignedRaw, undefined, undefined, chainConfig.rpc);

      addAgentLog("treasurer", `Sent ${amount} native on ${chain} to ${to}. Tx: ${result.txHash}`);
      return Response.json({ success: true, txHash: result.txHash });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Send failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
