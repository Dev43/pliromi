import { readStore, updateStore } from "@/lib/db";
import { getWalletInfo } from "@/lib/wallet";

export async function GET() {
  const store = readStore();
  return Response.json({ org: store.org });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    return Response.json({ error: "Organization name is required" }, { status: 400 });
  }

  // Ensure wallet exists
  const wallet = getWalletInfo();

  const data = updateStore((store) => {
    store.org = {
      name,
      description: description || "",
      walletName: wallet.name,
    };
  });

  return Response.json({ org: data.org, wallet: { id: wallet.id, name: wallet.name } });
}
