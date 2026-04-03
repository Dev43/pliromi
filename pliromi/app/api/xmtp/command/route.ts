import { runTreasurer } from "@/lib/agents/treasurer";
import { chatWithSeller } from "@/lib/agents/seller";
import { postToGroup } from "@/lib/xmtp-agent";
import { addAgentLog } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body;

  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const trimmed = message.trim();

  // /treasurer [optional question]
  if (trimmed.startsWith("/treasurer")) {
    const question = trimmed.slice("/treasurer".length).trim();

    if (!question || question === "run" || question === "status") {
      // Run the treasurer and post results
      try {
        const result = await runTreasurer();
        const reply = `Treasury Status:\n- Total USDC: $${result.totalUsdc}\n- Lulo Target (30%): $${result.luloTarget}\n- Lulo Position: $${result.luloPosition}`;
        await postToGroup("Treasurer", reply).catch(() => {});
        return Response.json({ reply, agent: "treasurer" });
      } catch (err) {
        const errMsg = `Treasurer error: ${err instanceof Error ? err.message : "Unknown error"}`;
        await postToGroup("Treasurer", errMsg).catch(() => {});
        return Response.json({ reply: errMsg, agent: "treasurer" });
      }
    } else {
      // Answer a question about treasury
      const result = await runTreasurer();
      const reply = `Treasury Status: $${result.totalUsdc} total USDC, $${result.luloPosition} in Lulo (target: $${result.luloTarget}).\n\nRegarding "${question}": I monitor all wallet balances and ensure 30% of the float is earning yield in Lulo. I bridge USDC via Relay when needed.`;
      await postToGroup("Treasurer", reply).catch(() => {});
      return Response.json({ reply, agent: "treasurer" });
    }
  }

  // /seller [message about products]
  if (trimmed.startsWith("/seller")) {
    const question = trimmed.slice("/seller".length).trim() || "What do you have for sale?";

    try {
      const result = await chatWithSeller(question);
      await postToGroup("Seller", result.reply).catch(() => {});
      return Response.json({ reply: result.reply, agent: "seller", offeredPrice: result.offeredPrice });
    } catch (err) {
      const errMsg = `Seller error: ${err instanceof Error ? err.message : "Unknown error"}`;
      return Response.json({ reply: errMsg, agent: "seller" });
    }
  }

  return Response.json({ error: "Unknown command. Try /treasurer or /seller" }, { status: 400 });
}
