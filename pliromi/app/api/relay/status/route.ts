import { checkRelayStatus } from "@/lib/relay";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return Response.json({ error: "requestId is required" }, { status: 400 });
  }

  try {
    const status = await checkRelayStatus(requestId);
    return Response.json(status);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Status check failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
