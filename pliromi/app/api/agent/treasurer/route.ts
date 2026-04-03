import { addAgentLog } from "@/lib/db";
import { runTreasurer } from "@/lib/agents/treasurer";

export async function POST() {
  addAgentLog("treasurer", "Treasurer agent triggered manually");

  try {
    const result = await runTreasurer();
    return Response.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    addAgentLog("treasurer", `Error during run: ${msg}`);
    return Response.json({ error: msg }, { status: 500 });
  }
}
