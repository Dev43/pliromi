import { getBalances } from "@/lib/wallet";

export async function GET() {
  const accounts = await getBalances();
  const totalUsdc = accounts.reduce((sum, acc) => {
    return sum + parseFloat(acc.usdcBalance || "0");
  }, 0);

  return Response.json({ accounts, totalUsdc: totalUsdc.toFixed(2) });
}
