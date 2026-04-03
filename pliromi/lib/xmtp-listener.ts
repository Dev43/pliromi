// Background XMTP message listener — watches the group chat and routes
// slash commands to agents, responding directly in the XMTP group.

import { getAgentClient, getGroupConversation, postToGroup } from "./xmtp-agent";
import { chatWithTreasurer } from "./agents/treasurer";
import { chatWithSeller } from "./agents/seller";
import { addAgentLog } from "./db";

let listenerStarted = false;
let listenerStarting = false;

export async function startXmtpListener() {
  if (listenerStarted || listenerStarting) return;
  listenerStarting = true;

  try {
    const client = await getAgentClient();
    if (!client) {
      console.log("[XMTP Listener] No agent client available, skipping");
      listenerStarting = false;
      return;
    }

    const group = await getGroupConversation();
    if (!group) {
      console.log("[XMTP Listener] No group found, will retry on next request");
      listenerStarting = false;
      return;
    }

    const agentInboxId = client.inboxId;
    console.log("[XMTP Listener] Starting message stream for group:", group.id);

    // Stream all messages on all conversations
    const stream = await client.conversations.streamAllMessages({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onValue: async (msg: any) => {
        try {
          // Only process text messages in our group, not from ourselves
          if (msg.conversationId !== group.id) return;
          if (msg.kind !== 0) return;
          if (msg.senderInboxId === agentInboxId) return;

          const text = typeof msg.content === "string"
            ? msg.content.trim()
            : "";
          if (!text) return;

          // Route slash commands
          if (text.startsWith("/treasurer")) {
            const question = text.slice("/treasurer".length).trim() || "Give me a status report.";
            addAgentLog("treasurer", `XMTP command: ${question}`);

            try {
              const reply = await chatWithTreasurer(question);
              await postToGroup("Treasurer", reply);
            } catch (err) {
              const errMsg = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
              await postToGroup("Treasurer", errMsg);
            }
          } else if (text.startsWith("/seller")) {
            const question = text.slice("/seller".length).trim() || "What do you have for sale?";
            addAgentLog("seller", `XMTP command: ${question}`);

            try {
              const result = await chatWithSeller(question);
              await postToGroup("Seller", result.reply);
            } catch (err) {
              const errMsg = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
              await postToGroup("Seller", errMsg);
            }
          }
          // Non-command messages are ignored (regular chat)
        } catch (err) {
          console.error("[XMTP Listener] Error processing message:", err);
        }
      },
    });

    // Keep a reference so we could stop it later if needed
    (globalThis as Record<string, unknown>).__xmtpStream = stream;
    listenerStarted = true;
    console.log("[XMTP Listener] Message stream active");
  } catch (error) {
    console.error("[XMTP Listener] Failed to start:", error);
    listenerStarting = false;
  }
}
