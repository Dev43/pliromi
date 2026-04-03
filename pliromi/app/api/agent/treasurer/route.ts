import { addAgentLog } from "@/lib/db";
import { runTreasurer } from "@/lib/agents/treasurer";
import { postToGroup } from "@/lib/xmtp-agent";

export async function POST() {
  addAgentLog("treasurer", "Treasurer agent triggered manually");

  try {
    const result = await runTreasurer();
    return Response.json({ success: true, ...result });
  } catch (error) {
    const msg = `Treasurer error: ${error instanceof Error ? error.message : "Unknown error"}`;
    addAgentLog("treasurer", msg);
    postToGroup("Treasurer", msg).catch(() => {});
    return Response.json({ error: msg }, { status: 500 });
  }
}
