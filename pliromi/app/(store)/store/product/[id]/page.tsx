"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PaymentModal from "@/components/PaymentModal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetch("/api/store/products")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.products || []).find(
          (p: Product) => p.id === params.id
        );
        setProduct(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !product) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/agent/seller/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          productId: product.id,
          history: chatHistory,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had a connection issue. Try again?" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">
        Product not found
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Info */}
        <div>
          <div className="h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl flex items-center justify-center mb-6">
            <div className="text-7xl font-bold text-emerald-200">
              {product.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-gray-500 mb-4">{product.description}</p>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-emerald-600">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400">USDC</span>
          </div>
          <p className="text-sm text-gray-400 mb-4">{product.quantity} in stock</p>
          <button
            onClick={() => setShowPayment(true)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Buy Now
          </button>
        </div>

        {/* Haggle Chat */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col h-[500px]">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Chat with Seller
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Try negotiating for a better price!
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
            {chatHistory.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                Ask about the product or try to negotiate the price.
              </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-emerald-50 border border-emerald-100 ml-8"
                    : "bg-gray-50 border border-gray-100 mr-8"
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    msg.role === "user" ? "text-emerald-700" : "text-blue-600"
                  }`}
                >
                  {msg.role === "user" ? "You" : "Seller Agent"}
                </span>
                <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 mr-8 text-sm text-gray-400">
                Seller is typing...
              </div>
            )}
          </div>

          <form onSubmit={sendChat} className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Can I get a discount?"
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatMessage.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {showPayment && (
        <PaymentModal product={product} onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
}
