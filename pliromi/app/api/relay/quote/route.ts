import { getRelayQuote } from "@/lib/relay";

export async function POST(request: Request) {
  const body = await request.json();
  const { user, fromChain, toChain, token, amount, recipient } = body;

  if (!user || !fromChain || !toChain || !amount) {
    return Response.json(
      { error: "user, fromChain, toChain, and amount are required" },
      { status: 400 }
    );
  }

  try {
    const quote = await getRelayQuote({
      user,
      fromChain,
      toChain,
      token: token || "usdc",
      amount,
      recipient,
    });
    return Response.json({ quote });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Quote failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
