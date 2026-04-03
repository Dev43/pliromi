// Server-side XMTP client for agents to post to the group chat
import { readStore } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agentClient: any = null;
let initialized = false;
let initializing = false;

export async function getAgentClient() {
  if (agentClient && initialized) return agentClient;
  if (initializing) {
    // Don't block — just skip this post
    return null;
  }

  const privateKey = process.env.XMTP_AGENT_PRIVATE_KEY;
  if (!privateKey) {
    console.log("[XMTP Agent] No XMTP_AGENT_PRIVATE_KEY set, skipping");
    return null;
  }

  initializing = true;

  try {
    const { Client } = await import("@xmtp/node-sdk");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const signer = {
      type: "EOA" as const,
      getIdentifier: () => ({
        identifier: account.address,
        identifierKind: 0, // IdentifierKind.Ethereum = 0
      }),
      signMessage: async (message: string) => {
        const signature = await account.signMessage({ message });
        // Convert hex to Uint8Array
        const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentClient = await Client.create(signer, { env: "dev" } as any);
    initialized = true;
    console.log("[XMTP Agent] Client created, inboxId:", agentClient.inboxId);

    return agentClient;
  } catch (error) {
    console.error("[XMTP Agent] Failed to create client:", error);
    initializing = false;
    return null;
  }
}

export async function getGroupConversation() {
  const client = await getAgentClient();
  if (!client) return null;

  const store = readStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupId = (store as any).xmtpGroupId;
  if (!groupId) return null;

  await client.conversations.sync();
  const group = await client.conversations.getConversationById(groupId);
  if (!group) return null;

  await group.sync();
  return group;
}

export async function postToGroup(agentName: string, message: string): Promise<boolean> {
  try {
    const client = await getAgentClient();
    if (!client) return false;

    const store = readStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupId = (store as any).xmtpGroupId;
    if (!groupId) {
      console.log("[XMTP Agent] No group ID stored yet");
      return false;
    }

    await client.conversations.sync();
    const group = await client.conversations.getConversationById(groupId);
    if (!group) {
      console.log("[XMTP Agent] Group not found:", groupId);
      return false;
    }

    await group.sync();
    const formattedMessage = `[${agentName.toUpperCase()}] ${message}`;
    await group.sendText(formattedMessage);
    console.log(`[XMTP Agent] ${agentName} posted to group`);
    return true;
  } catch (error) {
    console.error(`[XMTP Agent] Failed to post for ${agentName}:`, error);
    return false;
  }
}
