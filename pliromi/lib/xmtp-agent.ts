// Server-side XMTP client for agents to post to the group chat
import { readStore, updateStore } from "@/lib/db";
import { GROUP_NAME, GROUP_DESCRIPTION } from "@/lib/xmtp";

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

  await client.conversations.sync();

  const store = readStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupId = (store as any).xmtpGroupId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let group: any = null;

  // Try to find existing group by stored ID
  if (groupId) {
    try {
      group = await client.conversations.getConversationById(groupId);
    } catch {
      // Not found
    }
  }

  // Fallback: scan conversations for group with matching name
  if (!group) {
    try {
      const allConvos = await client.conversations.list();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group = allConvos.find((c: any) => c.name === GROUP_NAME) || null;
    } catch {
      // List failed
    }
  }

  // Create new group if none exists
  if (!group) {
    try {
      group = await client.conversations.createGroup([], {
        groupName: GROUP_NAME,
        groupDescription: GROUP_DESCRIPTION,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateStore((s: any) => { s.xmtpGroupId = group.id; });
      await group.sendText(`${GROUP_NAME} group chat created. Agents will post updates here.`);
      console.log("[XMTP Agent] Created new group:", group.id);
    } catch (error) {
      console.error("[XMTP Agent] Failed to create group:", error);
      return null;
    }
  } else {
    // Keep stored ID in sync
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (group.id !== groupId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateStore((s: any) => { s.xmtpGroupId = group.id; });
    }
  }

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
