import { getGroupConversation, getAgentClient } from "@/lib/xmtp-agent";

export async function GET(request: Request) {
  try {
    const group = await getGroupConversation();
    if (!group) {
      return Response.json({ messages: [], error: "No group found" });
    }

    const url = new URL(request.url);
    const afterParam = url.searchParams.get("after");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMessages = (await group.messages()) as any[];
    const decoded = allMessages
      .filter((m) => m.kind === 0)
      .map((m) => ({
        id: m.id,
        senderInboxId: m.senderInboxId,
        content:
          typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        sentAt: new Date(m.sentAt).toISOString(),
      }))
      .filter((m) => {
        if (!afterParam) return true;
        return new Date(m.sentAt).getTime() > new Date(afterParam).getTime();
      });

    const client = await getAgentClient();
    return Response.json({
      messages: decoded,
      agentInboxId: client?.inboxId || null,
    });
  } catch (error) {
    console.error("[XMTP Messages] GET error:", error);
    return Response.json({ messages: [], error: "Failed to fetch messages" });
  }
}

export async function POST(request: Request) {
  try {
    const { message, sender } = await request.json();
    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const group = await getGroupConversation();
    if (!group) {
      return Response.json(
        { error: "No group found. Complete onboarding first." },
        { status: 404 }
      );
    }

    const text = sender ? `[${sender}] ${message}` : message;
    await group.sendText(text);

    return Response.json({ success: true });
  } catch (error) {
    console.error("[XMTP Messages] POST error:", error);
    return Response.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
