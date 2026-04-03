import { exec } from "child_process";
import { promisify } from "util";
import { addAgentLog } from "@/lib/db";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { name, walletAddress, chain, token } = await request.json();

  if (!walletAddress || !chain || !token) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const label = name || "Pliromi Deposit";

  try {
    const cmd = `mp deposit create --name "${label}" --wallet ${walletAddress} --chain ${chain} --token ${token} --json`;

    addAgentLog("System", `Creating deposit: ${label} → ${token} on ${chain}`);

    const { stdout } = await execAsync(cmd, { timeout: 30000 });

    let parsed;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      // If not JSON, return raw output
      parsed = { raw: stdout.trim() };
    }

    addAgentLog("System", `Deposit created for ${chain} (${token})`);

    return Response.json({
      message: "Deposit created successfully",
      deposit: parsed,
    });
  } catch (err) {
    const message = (err as Error).message || "Failed to create deposit";
    addAgentLog("System", `Deposit error: ${message.slice(0, 200)}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
