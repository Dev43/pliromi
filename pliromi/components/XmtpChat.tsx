"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { XMTP_ENV, GROUP_NAME, GROUP_DESCRIPTION, XMTP_GROUP_KEY } from "@/lib/xmtp";

interface ChatMessage {
  id: string;
  senderInboxId: string;
  content: string;
  sentAt: Date;
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function XmtpChat() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<{ end: () => Promise<unknown> } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet extension found. Install MetaMask or Rabby.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0].toLowerCase();
      setWalletAddress(address);

      const { Client } = await import("@xmtp/browser-sdk");
      const { toBytes } = await import("viem");

      // Build signer matching what XMTP's createEOASigner does internally
      const signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifier: address,
          identifierKind: 0, // IdentifierKind.Ethereum
        }),
        signMessage: async (message: string) => {
          // Convert message to hex for personal_sign
          const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
          const signature = (await window.ethereum!.request({
            method: "personal_sign",
            params: [hexMessage, address],
          })) as `0x${string}`;
          return toBytes(signature);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = await Client.create(signer as any, { env: XMTP_ENV } as any);

      clientRef.current = client;
      setInboxId(client.inboxId || null);

      // Revoke stale installations to stay under XMTP's 10-installation limit
      try {
        await client.revokeAllOtherInstallations();
      } catch (e) {
        console.warn("Failed to revoke old XMTP installations:", e);
      }

      await client.conversations.sync();

      // Try to find existing group: localStorage first, then server-side, then scan conversations
      let group = null;
      const candidateIds: string[] = [];

      const localId = localStorage.getItem(XMTP_GROUP_KEY);
      if (localId) candidateIds.push(localId);

      // Fetch server-side stored group ID as fallback
      try {
        const res = await fetch("/api/xmtp/group");
        const data = await res.json();
        if (data.groupId && !candidateIds.includes(data.groupId)) {
          candidateIds.push(data.groupId);
        }
      } catch {
        // Server unavailable, continue with what we have
      }

      // Try each candidate ID
      for (const id of candidateIds) {
        try {
          const found = await client.conversations.getConversationById(id);
          if (found) {
            group = found;
            break;
          }
        } catch {
          // Not found, try next
        }
      }

      // Last resort: scan all conversations for a group with matching name
      if (!group) {
        try {
          const allConversations = await client.conversations.list();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          group = allConversations.find((c: any) => c.name === GROUP_NAME) || null;
        } catch {
          // List failed, will create new
        }
      }

      if (!group) {
        group = await client.conversations.createGroup([], {
          groupName: GROUP_NAME,
          groupDescription: GROUP_DESCRIPTION,
        });

        await fetch("/api/xmtp/group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: group.id }),
        });

        await group.sendText(
          `${GROUP_NAME} group chat created. Agents will post updates here.`
        );
      }

      // Keep both stores in sync with the found/created group
      localStorage.setItem(XMTP_GROUP_KEY, group.id);

      groupRef.current = group;
      setGroupId(group.id);

      await group.sync();
      const existingMessages = await group.messages();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = (existingMessages as any[])
        .filter((m) => m.kind === 0)
        .map((m) => ({
          id: m.id,
          senderInboxId: m.senderInboxId,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          sentAt: m.sentAt,
        }));
      setMessages(decoded);

      const stream = await client.conversations.streamAllMessages({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onValue: (msg: any) => {
          if (msg.conversationId === group!.id && msg.kind === 0) {
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              // Replace optimistic message from same sender with same content
              const optimisticIdx = prev.findIndex(
                (m) => m.id.startsWith("local-") && m.senderInboxId === msg.senderInboxId && m.content === content
              );
              if (optimisticIdx !== -1) {
                const updated = [...prev];
                updated[optimisticIdx] = {
                  id: msg.id,
                  senderInboxId: msg.senderInboxId,
                  content,
                  sentAt: msg.sentAt,
                };
                return updated;
              }
              return [
                ...prev,
                { id: msg.id, senderInboxId: msg.senderInboxId, content, sentAt: msg.sentAt },
              ];
            });
          }
        },
      });
      streamRef.current = stream;

      setConnected(true);
      // Persist so we auto-reconnect on page load
      localStorage.setItem("pliromi_xmtp_connected", "true");
    } catch (err) {
      console.error("XMTP connection error:", err);
      const errMsg = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to connect. Make sure to approve the wallet signature.";
      setError(errMsg);
      localStorage.removeItem("pliromi_xmtp_connected");
    } finally {
      setConnecting(false);
    }
  }, []);

  // Auto-reconnect if previously connected
  useEffect(() => {
    if (!connected && !connecting && localStorage.getItem("pliromi_xmtp_connected") === "true" && window.ethereum) {
      connectWallet();
    }
  }, [connected, connecting, connectWallet]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.end();
      }
    };
  }, []);

  const COMMANDS = [
    { cmd: "/treasurer", desc: "Ask the Treasurer agent", hint: "/treasurer [question or 'status']" },
    { cmd: "/seller", desc: "Ask the Seller agent", hint: "/seller [question about products]" },
  ];

  const [showCommands, setShowCommands] = useState(false);

  // Show autocomplete when typing "/"
  useEffect(() => {
    setShowCommands(newMessage === "/" || (newMessage.startsWith("/") && !newMessage.includes(" ")));
  }, [newMessage]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupRef.current) return;

    const text = newMessage.trim();
    setNewMessage("");
    setShowCommands(false);

    // Optimistically add user message
    const optimisticMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      senderInboxId: inboxId || "",
      content: text,
      sentAt: new Date(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Check if it's a slash command
    if (text.startsWith("/treasurer") || text.startsWith("/seller")) {
      // Try sending to XMTP group (non-blocking)
      if (groupRef.current) {
        groupRef.current.sendText(text).catch(() => {});
      }

      // Process command via API
      try {
        const res = await fetch("/api/xmtp/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        const reply = data.reply || data.error || "No response from agent";
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          senderInboxId: data.agent === "treasurer" ? "treasurer-agent" : "seller-agent",
          content: reply,
          sentAt: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        const errMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          senderInboxId: "system",
          content: `Command failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          sentAt: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
      return;
    }

    // Regular message
    try {
      await groupRef.current.sendText(text);
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(text);
    }
  };

  const truncateId = (id: string) => {
    if (!id) return "Unknown";
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const isOwnMessage = (senderInboxId: string) => {
    return inboxId && senderInboxId === inboxId;
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          XMTP Group Chat
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm mb-4">
            Connect your wallet to join the team group chat powered by XMTP.
          </p>
          {error && (
            <p className="text-red-500 text-xs mb-3 max-w-xs mx-auto">{error}</p>
          )}
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {connecting ? "Connecting..." : "Connect Wallet & Join Chat"}
          </button>
          {walletAddress && (
            <p className="text-xs text-gray-400 mt-2">
              Wallet: {truncateId(walletAddress)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">XMTP Chat</h2>
          <p className="text-xs text-gray-400">
            Group: {groupId ? truncateId(groupId) : "..."} | You: {inboxId ? truncateId(inboxId) : "..."}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 mb-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-2.5 text-xs ${
                isOwnMessage(msg.senderInboxId)
                  ? "bg-emerald-50 border border-emerald-100 ml-4"
                  : msg.senderInboxId === "treasurer-agent"
                    ? "bg-amber-50 border border-amber-100 mr-4"
                    : msg.senderInboxId === "seller-agent"
                      ? "bg-purple-50 border border-purple-100 mr-4"
                      : "bg-gray-50 border border-gray-100 mr-4"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`font-semibold ${
                    isOwnMessage(msg.senderInboxId)
                      ? "text-emerald-700"
                      : msg.senderInboxId === "treasurer-agent"
                        ? "text-amber-700"
                        : msg.senderInboxId === "seller-agent"
                          ? "text-purple-700"
                          : "text-blue-600"
                  }`}
                >
                  {isOwnMessage(msg.senderInboxId) ? "You"
                    : msg.senderInboxId === "treasurer-agent" ? "Treasurer"
                    : msg.senderInboxId === "seller-agent" ? "Seller"
                    : truncateId(msg.senderInboxId)}
                </span>
                <span className="text-gray-300">
                  {new Date(msg.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Slash command autocomplete — inline above input */}
      {showCommands && (
        <div className="mb-2 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex-shrink-0">
          {COMMANDS.filter((c) => c.cmd.startsWith(newMessage)).map((c) => (
            <button
              key={c.cmd}
              onClick={() => { setNewMessage(c.cmd + " "); setShowCommands(false); }}
              className="w-full px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700">{c.cmd}</span>
                <span className="text-xs text-gray-500">{c.desc}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{c.hint}</p>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={sendMessage} className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type / for commands or a message..."
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
