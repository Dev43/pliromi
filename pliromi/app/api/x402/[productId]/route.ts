import { readStore, updateStore, addAgentLog } from "@/lib/db";
import { getWalletAccounts } from "@/lib/wallet";
import { postToGroup } from "@/lib/xmtp-agent";
import { verifyEvmTransaction } from "@/lib/verify-tx";

// GET — x402 protocol handler
// Without X-PAYMENT header: returns 402 with payment requirements
// With X-PAYMENT header: verifies payment and returns 200 with content
export async function GET(
  request: Request,
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

  const url = new URL(request.url);
  const requestedPrice = parseFloat(url.searchParams.get("price") || "0");
  const finalPrice = requestedPrice > 0 ? requestedPrice : product.maxPrice;

  const accounts = await getWalletAccounts();
  const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address;

  // Check for x402 payment proof header
  const paymentHeader = request.headers.get("X-PAYMENT") || request.headers.get("x-payment");

  if (paymentHeader) {
    // Payment proof received — verify and fulfill
    try {
      let paymentData: { scheme?: string; network?: string; payload?: { txHash?: string; from?: string } };
      try {
        paymentData = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
      } catch {
        // Might be a raw tx hash or different format
        paymentData = { payload: { txHash: paymentHeader } };
      }

      const txHash = paymentData?.payload?.txHash || paymentHeader;
      const network = paymentData?.network || "base";
      const from = paymentData?.payload?.from;

      // Record the sale
      updateStore((data) => {
        const item = data.inventory.find((i) => i.id === productId);
        if (item && item.quantity > 0) {
          item.quantity -= 1;
        }
        data.sales.push({
          id: crypto.randomUUID(),
          productId,
          price: finalPrice,
          chain: network,
          txHash: typeof txHash === "string" ? txHash : JSON.stringify(txHash),
          timestamp: new Date().toISOString(),
        });
      });

      const saleMsg = `x402 sale: ${product.name} for $${finalPrice.toFixed(2)} USDC on ${network}${from ? ` from ${from}` : ""}`;
      addAgentLog("seller", saleMsg);
      postToGroup("Seller", saleMsg).catch(() => {});

      // Return 200 with the purchased content
      const response = {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: finalPrice,
        },
        message: `Purchase confirmed! You bought ${product.name} for $${finalPrice.toFixed(2)} USDC.`,
        receipt: {
          txHash,
          network,
          timestamp: new Date().toISOString(),
        },
      };

      // Build settlement response for X-PAYMENT-RESPONSE header
      const settlementResponse = Buffer.from(
        JSON.stringify({ success: true, txHash, network })
      ).toString("base64");

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT-RESPONSE": settlementResponse,
        },
      });
    } catch (err) {
      return Response.json(
        { error: `Payment verification failed: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 400 }
      );
    }
  }

  // No payment header — return 402 with payment requirements
  const usdcAmount = Math.floor(finalPrice * 1_000_000);

  return new Response(
    JSON.stringify({
      message: "Payment required",
      product: product.name,
      amount: finalPrice,
      currency: "USDC",
      accepts: [
        {
          scheme: "exact",
          network: "base",
          payTo: evmAddress,
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          amount: String(usdcAmount),
          extra: { productId },
        },
        {
          scheme: "exact",
          network: "ethereum",
          payTo: evmAddress,
          asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          amount: String(usdcAmount),
          extra: { productId },
        },
        {
          scheme: "exact",
          network: "polygon",
          payTo: evmAddress,
          asset: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
          amount: String(usdcAmount),
          extra: { productId },
        },
      ],
    }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// POST — manual payment verification (for browser-based flow)
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

  // Record the sale
  updateStore((data) => {
    const item = data.inventory.find((i) => i.id === productId);
    if (item && item.quantity > 0) {
      item.quantity -= 1;
    }
    data.sales.push({
      id: crypto.randomUUID(),
      productId,
      price: price || product.maxPrice,
      chain: paymentChain,
      txHash,
      timestamp: new Date().toISOString(),
    });
  });

  const saleMsg = `Sale completed: ${product.name} for $${(price || product.maxPrice).toFixed(2)} USDC on ${paymentChain}. Tx: ${txHash}`;
  addAgentLog("seller", saleMsg);
  postToGroup("Seller", saleMsg).catch(() => {});

  return Response.json({
    success: true,
    message: `Purchase of ${product.name} confirmed!`,
    txHash,
  });
}
