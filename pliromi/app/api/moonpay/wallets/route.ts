import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// GET - list wallets
export async function GET() {
  try {
    const { stdout } = await execAsync("npx mp --json wallet list", { timeout: 8000 });
    let wallets;
    try {
      wallets = JSON.parse(stdout);
    } catch {
      wallets = stdout.trim();
    }
    return Response.json({ wallets });
  } catch {
    return Response.json({ wallets: [] });
  }
}

// POST - create wallet
export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body;

  try {
    const { stdout } = await execAsync(
      `npx mp wallet create --name "${name || "pliromi"}"`,
      { timeout: 10000 }
    );
    return Response.json({ success: true, message: stdout.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create wallet";
    return Response.json({ error: msg }, { status: 500 });
  }
}
