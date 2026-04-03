import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// GET - check if logged in
export async function GET() {
  try {
    const { stdout } = await execAsync("npx mp user retrieve", { timeout: 8000 });
    return Response.json({ loggedIn: true, user: stdout.trim() });
  } catch {
    return Response.json({ loggedIn: false });
  }
}

// POST - initiate login
export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const { stdout } = await execAsync(`npx mp login --email "${email}"`, { timeout: 10000 });
    return Response.json({ success: true, message: stdout.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Login failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
