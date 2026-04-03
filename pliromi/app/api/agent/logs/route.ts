import { readStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  return Response.json({ logs: store.agentLogs });
}
