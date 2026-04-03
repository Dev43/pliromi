"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface ChatMessage {
  id: string;
  senderInboxId: string;
  content: string;
  sentAt: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [agentInboxId, setAgentInboxId] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(false);

  const COMMANDS = [
    { cmd: "/treasurer", desc: "Ask the Treasurer agent", hint: "/treasurer [status | question]" },
    { cmd: "/seller", desc: "Ask the Seller agent", hint: "/seller [question about products]" },
  ];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/xmtp/messages");
      const data = await res.json();
      if (data.messages) {
        setMessages((prev) => {
          const serverMsgs = data.messages as ChatMessage[];
          // Keep any optimistic (local-*) messages that haven't appeared server-side yet
          const localMsgs = prev.filter(
            (m) =>
              m.id.startsWith("local-") &&
              !serverMsgs.some((s) => s.content === m.content)
          );
          return [...serverMsgs, ...localMsgs];
        });
      }
      if (data.agentInboxId) {
        setAgentInboxId(data.agentInboxId);
      }
    } catch {
      // Silent fail on poll
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMessages();
      pollingRef.current = setInterval(fetchMessages, 3000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, fetchMessages]);

  // Show autocomplete when typing "/"
  useEffect(() => {
    setShowCommands(
      newMessage === "/" || (newMessage.startsWith("/") && !newMessage.includes(" "))
    );
  }, [newMessage]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setShowCommands(false);
    setSending(true);

    // Optimistic add
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      senderInboxId: agentInboxId || "you",
      content: text,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Handle slash commands
    if (text.startsWith("/treasurer") || text.startsWith("/seller")) {
      try {
        // Send to XMTP group (non-blocking)
        fetch("/api/xmtp/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }).catch(() => {});

        // Process command
        const res = await fetch("/api/xmtp/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        const reply = data.reply || data.error || "No response";

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          senderInboxId: data.agent === "treasurer" ? "treasurer-agent" : "seller-agent",
          content: reply,
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch {
        const errMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          senderInboxId: "system",
          content: "Command failed. Try again.",
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setSending(false);
      }
      return;
    }

    // Regular message
    try {
      await fetch("/api/xmtp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const truncateId = (id: string) => {
    if (!id) return "Unknown";
    return `${id.slice(0, 6)}..${id.slice(-4)}`;
  };

  const isAgentMessage = (senderInboxId: string) => {
    return agentInboxId && senderInboxId === agentInboxId;
  };

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-white font-semibold text-sm">
                Team Chat
              </h3>
              <p className="text-emerald-100 text-xs">
                Powered by XMTP
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-8">
                No messages yet
              </div>
            ) : (
              messages.map((msg) => {
                const own = isAgentMessage(msg.senderInboxId);
                const isAgent = msg.senderInboxId === "treasurer-agent" || msg.senderInboxId === "seller-agent";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${own ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-xl px-3 py-2 text-sm ${
                        isAgent
                          ? "max-w-[95%] bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                          : own
                            ? "max-w-[80%] bg-emerald-600 text-white rounded-br-sm"
                            : "max-w-[85%] bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      {!own && (
                        <div className={`text-[10px] font-medium mb-0.5 ${
                          msg.senderInboxId === "treasurer-agent" ? "text-amber-600"
                          : msg.senderInboxId === "seller-agent" ? "text-purple-600"
                          : "text-gray-400"
                        }`}>
                          {msg.senderInboxId === "treasurer-agent" ? "Treasurer Agent"
                           : msg.senderInboxId === "seller-agent" ? "Seller Agent"
                           : truncateId(msg.senderInboxId)}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed break-words">
                        {msg.content}
                      </p>
                      <div
                        className={`text-[10px] mt-1 ${
                          own ? "text-emerald-200" : "text-gray-300"
                        }`}
                      >
                        {new Date(msg.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Slash command autocomplete */}
          {showCommands && (
            <div className="border-t border-gray-200 bg-white shrink-0">
              {COMMANDS.filter((c) => c.cmd.startsWith(newMessage)).map((c) => (
                <button
                  key={c.cmd}
                  onClick={() => { setNewMessage(c.cmd + " "); setShowCommands(false); }}
                  className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
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

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="p-3 border-t border-gray-200 bg-white shrink-0"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white rounded-full transition-colors shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
      >
        {open ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
