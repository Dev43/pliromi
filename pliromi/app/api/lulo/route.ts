import { readStore, updateStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lulo = (store as any).lulo || { balance: 0, apy: 8.2, lastUpdated: new Date().toISOString() };
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
      apy: apy || 8.2,
      lastUpdated: new Date().toISOString(),
    };
  });

  return Response.json({ success: true });
}
