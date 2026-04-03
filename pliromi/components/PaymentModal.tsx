"use client";

import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface PaymentInfo {
  address: string;
  amount: number;
  currency: string;
  chain: string;
  x402Url: string;
}

const CHAINS = [
  { value: "base", label: "Base" },
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "solana", label: "Solana" },
];

export default function PaymentModal({
  product,
  onClose,
  negotiatedPrice,
}: {
  product: Product;
  onClose: () => void;
  negotiatedPrice?: number;
}) {
  const displayPrice = negotiatedPrice || product.price;
  const [chain, setChain] = useState("base");
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const initPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/buy/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, price: displayPrice }),
      });
      const data = await res.json();
      setPayment(data.payment);
    } catch (err) {
      console.error("Payment init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!txHash) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/x402/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, chain, price: displayPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-md mx-4">
        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-4 text-emerald-600">&#10003;</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Purchase Confirmed!
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              You bought {product.name} for ${displayPrice.toFixed(2)} USDC
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : !payment ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Buy {product.name}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &#x2715;
              </button>
            </div>

            <div className="bg-emerald-50 rounded-lg p-3 mb-4 border border-emerald-100">
              <div className="text-sm text-emerald-600">Total</div>
              <div className="text-2xl font-bold text-emerald-700">
                ${displayPrice.toFixed(2)} USDC
              </div>
              {negotiatedPrice && negotiatedPrice < product.price && (
                <div className="text-xs text-emerald-500 mt-1">
                  <span className="line-through text-gray-400">${product.price.toFixed(2)}</span> — negotiated price!
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Chain
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setChain(c.value)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      chain === c.value
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-50 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={initPayment}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Loading..." : "Proceed to Payment"}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Send Payment
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &#x2715;
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <div className="text-xs text-emerald-600 mb-1">Amount</div>
                <div className="text-lg font-bold text-emerald-700">
                  {payment.amount} {payment.currency}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">
                  Send to ({payment.chain})
                </div>
                <div className="text-sm text-gray-800 font-mono break-all">
                  {payment.address}
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(payment.address)
                  }
                  className="text-xs text-emerald-600 mt-1 hover:text-emerald-700 font-medium"
                >
                  Copy address
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Transaction Hash (after sending)
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={confirmPayment}
              disabled={loading || !txHash}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "Verifying..." : "Confirm Payment"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
