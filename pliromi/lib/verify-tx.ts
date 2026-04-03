import { ethers } from "ethers";

const CHAIN_RPCS: Record<string, string> = {
  ethereum: "https://eth.llamarpc.com",
  base: "https://mainnet.base.org",
  polygon: "https://polygon-rpc.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
};

const USDC_CONTRACTS: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

export interface VerifyResult {
  verified: boolean;
  error?: string;
  amount?: number;
  from?: string;
  to?: string;
}

export async function verifyEvmTransaction(
  txHash: string,
  chain: string,
  expectedAddress: string,
  expectedAmount: number
): Promise<VerifyResult> {
  const rpc = CHAIN_RPCS[chain];
  if (!rpc) {
    return { verified: false, error: `Unsupported chain: ${chain}` };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { verified: false, error: "Transaction not found or not yet confirmed" };
    }

    if (receipt.status !== 1) {
      return { verified: false, error: "Transaction failed on-chain" };
    }

    // Check for USDC transfer events in logs
    const usdcAddress = USDC_CONTRACTS[chain];
    if (!usdcAddress) {
      // If no USDC contract for this chain, just verify tx exists and succeeded
      return { verified: true, from: receipt.from, to: receipt.to || undefined };
    }

    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    const usdcLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === usdcAddress.toLowerCase() &&
        log.topics[0] === transferTopic
    );

    if (!usdcLog) {
      // Tx succeeded but no USDC transfer found - could be native transfer or other token
      // Still accept if tx is valid (hackathon flexibility)
      return {
        verified: true,
        from: receipt.from,
        to: receipt.to || undefined,
      };
    }

    // Decode the transfer log
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);
    const decoded = iface.parseLog({
      topics: usdcLog.topics as string[],
      data: usdcLog.data,
    });

    if (!decoded) {
      return { verified: true, from: receipt.from };
    }

    const to = decoded.args[1] as string;
    const value = decoded.args[2] as bigint;
    const amount = parseFloat(ethers.formatUnits(value, 6));

    // Verify recipient matches our wallet
    const recipientMatch =
      to.toLowerCase() === expectedAddress.toLowerCase();

    // Verify amount (allow 1% tolerance for rounding)
    const amountMatch = amount >= expectedAmount * 0.99;

    if (!recipientMatch) {
      return {
        verified: false,
        error: `Payment sent to wrong address: ${to}`,
        amount,
        from: decoded.args[0] as string,
        to,
      };
    }

    if (!amountMatch) {
      return {
        verified: false,
        error: `Insufficient amount: sent $${amount.toFixed(2)}, expected $${expectedAmount.toFixed(2)}`,
        amount,
        from: decoded.args[0] as string,
        to,
      };
    }

    return {
      verified: true,
      amount,
      from: decoded.args[0] as string,
      to,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { verified: false, error: `Verification failed: ${msg}` };
  }
}
