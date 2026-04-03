import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const body = await request.json();
  const { chain } = body;

  try {
    const { stdout, stderr } = await execAsync(
      `npx ows fund deposit --wallet hackathon --chain ${chain || "base"}`,
      { timeout: 15000 }
    );

    const output = stdout || stderr;

    // Parse deposit addresses from output
    const addresses: Record<string, string> = {};
    const addrMatches = output.matchAll(/(\w+)\s+(0x[a-fA-F0-9]+|bc1[a-z0-9]+|[A-HJ-NP-Za-km-z1-9]{32,}|T[A-Za-z1-9]{33})/g);
    for (const match of addrMatches) {
      addresses[match[1]] = match[2];
    }

    // Parse deposit URL
    const urlMatch = output.match(/(https:\/\/moonpay\.hel\.io\/[^\s]+)/);
    const depositUrl = urlMatch ? urlMatch[1] : null;

    // Parse deposit ID
    const idMatch = output.match(/Deposit created \(ID: ([a-f0-9]+)\)/);
    const depositId = idMatch ? idMatch[1] : null;

    return Response.json({
      success: true,
      depositId,
      depositUrl,
      addresses,
      chain: chain || "base",
      raw: output,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
