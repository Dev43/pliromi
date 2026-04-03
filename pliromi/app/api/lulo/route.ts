import { readStore, updateStore } from "@/lib/db";
import { getWalletAccounts } from "@/lib/wallet";

export async function GET() {
  // Fetch live data from Lulo API
  try {
    const accounts = await getWalletAccounts();
    const solanaAddr = accounts.find((a) => a.chainId.includes("solana"))?.address;

    if (solanaAddr) {
      const headers = {
        "x-api-key": process.env.LULO_API_KEY || "",
        "Content-Type": "application/json",
      };

      const [accountRes, ratesRes] = await Promise.all([
        fetch(`https://api.lulo.fi/v1/account.getAccount?owner=${solanaAddr}`, { headers }),
        fetch("https://api.lulo.fi/v1/rates.getRates", { headers }),
      ]);

      let balance = 0;
      let apy = 4.5;

      if (accountRes.ok) {
        const data = await accountRes.json();
        balance = data?.pusdUsdBalance || data?.totalUsdValue || 0;
      }

      if (ratesRes.ok) {
        const data = await ratesRes.json();
        apy = data?.protected?.CURRENT || 4.5;
      }

      const lulo = { balance, apy, lastUpdated: new Date().toISOString() };

      // Cache in store
      updateStore((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s as any).lulo = lulo;
      });

      return Response.json({ lulo });
    }
  } catch {
    // Fall through to stored data
  }

  // Fallback to stored data
  const store = readStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lulo = (store as any).lulo || { balance: 0, apy: 4.5, lastUpdated: new Date().toISOString() };
  return Response.json({ lulo });
}

// Used by treasurer to update Lulo position
export async function POST(request: Request) {
  const body = await request.json();
  const { balance, apy } = body;

  updateStore((store) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any).lulo = {
      balance: balance || 0,
      apy: apy || 4.5,
      lastUpdated: new Date().toISOString(),
    };
  });

  return Response.json({ success: true });
}
