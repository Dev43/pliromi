import { readStore, updateStore, addAgentLog } from "@/lib/db";
import { getWalletAccounts } from "@/lib/wallet";
import { postToGroup } from "@/lib/xmtp-agent";
import { verifyEvmTransaction } from "@/lib/verify-tx";

// GET returns 402 with payment headers (x402 protocol)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const store = readStore();
  const product = store.inventory.find((i) => i.id === productId);

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.quantity <= 0) {
    return Response.json({ error: "Out of stock" }, { status: 400 });
  }

  const accounts = await getWalletAccounts();
  const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address;

  return new Response(
    JSON.stringify({
      message: "Payment required",
      product: product.name,
      amount: product.maxPrice,
      currency: "USDC",
    }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Required": "true",
        "X-Payment-Address": evmAddress || "",
        "X-Payment-Chain": "base",
        "X-Payment-Amount": product.maxPrice.toString(),
        "X-Payment-Currency": "USDC",
        "X-Payment-Network": "base",
      },
    }
  );
}

// POST verifies payment and completes the purchase
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const body = await request.json();
  const { txHash, chain, price } = body;

  if (!txHash) {
    return Response.json({ error: "Transaction hash is required" }, { status: 400 });
  }

  const store = readStore();
  const product = store.inventory.find((i) => i.id === productId);

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  // Verify transaction on-chain
  const accounts = await getWalletAccounts();
  const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address || "";
  const paymentChain = chain || "base";

  if (paymentChain !== "solana") {
    const verification = await verifyEvmTransaction(
      txHash,
      paymentChain,
      evmAddress,
      price || product.maxPrice
    );

    if (!verification.verified) {
      addAgentLog("seller", `Payment verification failed: ${verification.error} (tx: ${txHash})`);
      return Response.json(
        { error: `Payment verification failed: ${verification.error}` },
        { status: 400 }
      );
    }

    addAgentLog("seller", `Payment verified on-chain: $${verification.amount?.toFixed(2) || "?"} USDC from ${verification.from}`);
  }

  // Record the sale and decrement inventory
  updateStore((data) => {
    const item = data.inventory.find((i) => i.id === productId);
    if (item && item.quantity > 0) {
      item.quantity -= 1;
    }

    data.sales.push({
      id: crypto.randomUUID(),
      productId,
      price: price || product.maxPrice,
      chain: chain || "base",
      txHash,
      timestamp: new Date().toISOString(),
    });
  });

  const saleMsg = `Sale completed: ${product.name} for $${(price || product.maxPrice).toFixed(2)} USDC on ${chain || "base"}. Tx: ${txHash}`;
  addAgentLog("seller", saleMsg);
  postToGroup("Seller", saleMsg).catch(() => {});

  return Response.json({
    success: true,
    message: `Purchase of ${product.name} confirmed!`,
    txHash,
  });
}
