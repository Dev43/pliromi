import { getWalletAccounts, getWalletInfo } from "@/lib/wallet";

export async function GET() {
  const wallet = getWalletInfo();
  const accounts = await getWalletAccounts();
  return Response.json({
    id: wallet.id,
    name: wallet.name,
    accounts,
  });
}
