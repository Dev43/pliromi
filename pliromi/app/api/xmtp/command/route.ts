import { chatWithTreasurer } from "@/lib/agents/treasurer";
import { chatWithSeller } from "@/lib/agents/seller";
import { postToGroup } from "@/lib/xmtp-agent";

export async function POST(request: Request) {
  const body = await request.json();
  const { message, history } = body;

  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const trimmed = message.trim();

  // /treasurer [message]
  if (trimmed.startsWith("/treasurer")) {
    const question = trimmed.slice("/treasurer".length).trim() || "Give me a status report.";

    try {
      const reply = await chatWithTreasurer(question, history);
      postToGroup("Treasurer", reply).catch(() => {});
      return Response.json({ reply, agent: "treasurer" });
    } catch (err) {
      const errMsg = `Treasurer error: ${err instanceof Error ? err.message : "Unknown error"}`;
      postToGroup("Treasurer", errMsg).catch(() => {});
      return Response.json({ reply: errMsg, agent: "treasurer" });
    }
  }

  // /seller [message]
  if (trimmed.startsWith("/seller")) {
    const question = trimmed.slice("/seller".length).trim() || "What do you have for sale?";

    try {
      const result = await chatWithSeller(question, undefined, history);
      postToGroup("Seller", result.reply).catch(() => {});
      return Response.json({ reply: result.reply, agent: "seller", offeredPrice: result.offeredPrice });
    } catch (err) {
      const errMsg = `Seller error: ${err instanceof Error ? err.message : "Unknown error"}`;
      return Response.json({ reply: errMsg, agent: "seller" });
    }
  }

  return Response.json({ error: "Unknown command. Try /treasurer or /seller" }, { status: 400 });
}
