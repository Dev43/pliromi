import { getBalancesForAddresses } from "@/lib/wallet";

export async function POST(request: Request) {
  const body = await request.json();
  const { addresses } = body;

  if (!addresses || Object.keys(addresses).length === 0) {
    return Response.json({ error: "addresses map required" }, { status: 400 });
  }

  const balances = await getBalancesForAddresses(addresses);
  return Response.json({ balances });
}
