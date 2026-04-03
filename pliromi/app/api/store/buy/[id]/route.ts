import { readStore } from "@/lib/db";
import { getWalletAccounts } from "@/lib/wallet";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { chain } = body;

  const store = readStore();
  const product = store.inventory.find((i) => i.id === id);

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.quantity <= 0) {
    return Response.json({ error: "Out of stock" }, { status: 400 });
  }

  const accounts = await getWalletAccounts();
  const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address;
  const solanaAddress = accounts.find((a) =>
    a.chainId.includes("solana")
  )?.address;

  const paymentAddress =
    chain === "solana" ? solanaAddress : evmAddress;

  return Response.json({
    product: {
      id: product.id,
      name: product.name,
      price: product.maxPrice,
    },
    payment: {
      address: paymentAddress,
      amount: product.maxPrice,
      currency: "USDC",
      chain: chain || "base",
      x402Url: `/api/x402/${product.id}`,
    },
  });
}
