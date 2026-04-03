"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import ProductCard from "@/components/ProductCard";
import PaymentModal from "@/components/PaymentModal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function ChatMarkdown({ content, isUser }: { content: string; isUser: boolean }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${isUser ? "text-white" : "text-emerald-700 hover:text-emerald-900"}`}
          >
            {children}
          </a>
        ),
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-1.5 space-y-0.5">{children}</ol>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-1.5 space-y-0.5">{children}</ul>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children }) => (
          <code className={`px-1 py-0.5 rounded text-xs font-mono ${isUser ? "bg-white/20" : "bg-gray-200"}`}>
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SellerChat({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null);
  const [negotiatedProductId, setNegotiatedProductId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Greet on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const productList = products.map((p) => p.name).join(", ");
      setMessages([
        {
          role: "assistant",
          content: productList
            ? `Hey there! Welcome to our store. We have ${productList} available. What are you interested in? Feel free to haggle!`
            : "Hey there! Welcome to our store. How can I help you today?",
        },
      ]);
    }
  }, [open, messages.length, products]);

  const negotiatedProduct = negotiatedProductId
    ? products.find((p) => p.id === negotiatedProductId)
    : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const text = input.trim();
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
      const res = await fetch("/api/agent/seller/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Sorry, I couldn't process that." },
      ]);

      // Track the latest negotiated price
      if (data.offeredPrice && data.offeredPrice > 0) {
        setNegotiatedPrice(data.offeredPrice);
        setNegotiatedProductId(data.productId || null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops, something went wrong. Try again!" },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
          </svg>
        )}
        {!open && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "min(500px, calc(100vh - 140px))" }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-emerald-600 text-white flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">Store Assistant</div>
              <div className="text-[10px] opacity-80">Ask about products, haggle for a deal!</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  <ChatMarkdown content={msg.content} isUser={msg.role === "user"} />
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 rounded-bl-sm">
                  Typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Negotiated price banner */}
          {negotiatedPrice && negotiatedProduct && (
            <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between flex-shrink-0">
              <div className="text-xs">
                <span className="text-amber-700 font-medium">{negotiatedProduct.name}</span>
                <span className="text-amber-600 ml-1">
                  <span className="line-through text-gray-400">${negotiatedProduct.price.toFixed(2)}</span>
                  {" "}${negotiatedPrice.toFixed(2)} USDC
                </span>
              </div>
              <button
                onClick={() => setShowPayment(true)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Buy Now
              </button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a product or make an offer..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {showPayment && negotiatedProduct && (
        <PaymentModal
          product={negotiatedProduct}
          onClose={() => setShowPayment(false)}
          negotiatedPrice={negotiatedPrice || undefined}
        />
      )}
    </>
  );
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/store/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Products</h1>
        <p className="text-gray-500">
          Browse and purchase with USDC. All payments via x402 protocol.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-lg mb-2">No products available</p>
          <p className="text-sm">Check back soon or contact the store admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <SellerChat products={products} />
    </div>
  );
}
