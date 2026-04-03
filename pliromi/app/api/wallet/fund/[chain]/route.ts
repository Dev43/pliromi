import { getWalletAccounts } from "@/lib/wallet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  const accounts = await getWalletAccounts();

  // Find the account for the requested chain
  const account = accounts.find(
    (a) => a.chainName.toLowerCase() === chain.toLowerCase() || a.chainId.includes(chain)
  );

  if (!account) {
    return Response.json({ error: `No account found for chain: ${chain}` }, { status: 404 });
  }

  return Response.json({
    chain: account.chainName,
    address: account.address,
    warning: "Only send USDC to this address",
  });
}
