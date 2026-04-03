import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const body = await request.json();
  const { email, code } = body;

  if (!email || !code) {
    return Response.json({ error: "Email and code are required" }, { status: 400 });
  }

  try {
    const { stdout } = await execAsync(
      `npx mp verify --email "${email}" --code "${code}"`,
      { timeout: 10000 }
    );
    return Response.json({ success: true, message: stdout.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Verification failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
