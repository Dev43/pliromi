"use client";

import { useEffect, useState, useCallback } from "react";

interface LasoCard {
  id: string;
  assignedTo: string;
  amount: number;
  cardNumber: string;
  expiry: string;
  cvv: string;
  status: "active" | "depleted" | "revoked";
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  type: "human" | "agent";
  role: string;
}

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

function CardVisual({
  card,
  revealed,
  onToggle,
}: {
  card: LasoCard;
  revealed: boolean;
  onToggle: () => void;
}) {
  const isRevoked = card.status === "revoked";
  const isDepleted = card.status === "depleted";

  const maskNumber = (num: string) => {
    if (num.length <= 4) return num;
    return num.slice(0, -4).replace(/./g, "\u2022") + " " + num.slice(-4);
  };

  const formatNumber = (num: string) => {
    return num.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <div
      className={`relative rounded-2xl p-5 text-white overflow-hidden h-48 flex flex-col justify-between ${
        isRevoked
          ? "bg-gradient-to-br from-gray-400 to-gray-500"
          : isDepleted
            ? "bg-gradient-to-br from-amber-400 to-amber-600"
            : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
      }`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border-[20px] border-white" />
        <div className="absolute -right-4 top-12 w-32 h-32 rounded-full border-[15px] border-white" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wider">LASO</span>
            <span className="text-[10px] opacity-70 uppercase">Prepaid</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isRevoked && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">REVOKED</span>
            )}
            {isDepleted && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">DEPLETED</span>
            )}
            <span className="text-lg font-bold">${card.amount}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <button
          onClick={onToggle}
          className="font-mono text-lg tracking-[0.2em] hover:opacity-80 transition-opacity"
        >
          {revealed ? formatNumber(card.cardNumber) : maskNumber(card.cardNumber)}
        </button>

        <div className="flex items-center justify-between mt-2">
          <div>
            <div className="text-[9px] uppercase opacity-60">Assigned To</div>
            <div className="text-xs font-medium">{card.assignedTo}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-60">Exp</div>
            <div className="text-xs font-mono">{revealed ? card.expiry : "**/**"}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-60">CVV</div>
            <div className="text-xs font-mono">{revealed ? card.cvv : "***"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderCardModal({
  team,
  onClose,
  onOrder,
}: {
  team: TeamMember[];
  onClose: () => void;
  onOrder: (amount: number, assignedTo: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [assignedTo, setAssignedTo] = useState(team[0]?.name || "");
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrder = async () => {
    const finalAmount = useCustom ? parseFloat(customAmount) : amount;
    if (!finalAmount || finalAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setOrdering(true);
    setError(null);
    try {
      await onOrder(finalAmount, assignedTo);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setOrdering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Order Debit Card</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by Laso Finance — prepaid card funded via x402
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Card Amount (USD)</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setAmount(preset); setUseCustom(false); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    !useCustom && amount === preset
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  ${preset}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  useCustom
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {team.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.type})
                </option>
              ))}
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {error && (
            <div className="text-xs p-2.5 rounded-lg bg-red-50 text-red-600">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleOrder}
            disabled={ordering}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {ordering ? "Ordering..." : `Order $${useCustom ? (customAmount || "0") : amount} Card`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DebitCardPage() {
  const [cards, setCards] = useState<LasoCard[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());

  const fetchCards = useCallback(async () => {
    try {
      const [cardsRes, teamRes] = await Promise.all([
        fetch("/api/laso"),
        fetch("/api/team"),
      ]);
      const cardsData = await cardsRes.json();
      const teamData = await teamRes.json();
      setCards(cardsData.cards || []);
      setTeam(teamData.team || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const toggleReveal = (id: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const orderCard = async (amount: number, assignedTo: string) => {
    const res = await fetch("/api/laso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, assignedTo }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    fetchCards();
  };

  const revokeCard = async (id: string) => {
    await fetch("/api/laso", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCards();
  };

  const activeCards = cards.filter((c) => c.status === "active");
  const inactiveCards = cards.filter((c) => c.status !== "active");
  const totalValue = activeCards.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debit Cards</h1>
          <p className="text-sm text-gray-500">
            Prepaid cards powered by Laso Finance
          </p>
        </div>
        <button
          onClick={() => setShowOrder(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Order Card
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Active Cards</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{activeCards.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total Value</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">${totalValue}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Total Issued</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{cards.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3 text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mx-auto">
              <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
              <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">No cards yet. Order your first debit card.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active cards */}
          {activeCards.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCards.map((card) => (
                  <div key={card.id}>
                    <CardVisual
                      card={card}
                      revealed={revealedCards.has(card.id)}
                      onToggle={() => toggleReveal(card.id)}
                    />
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[10px] text-gray-400">
                        Created {new Date(card.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => revokeCard(card.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive cards */}
          {inactiveCards.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Inactive Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
                {inactiveCards.map((card) => (
                  <div key={card.id}>
                    <CardVisual
                      card={card}
                      revealed={revealedCards.has(card.id)}
                      onToggle={() => toggleReveal(card.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showOrder && (
        <OrderCardModal
          team={team}
          onClose={() => setShowOrder(false)}
          onOrder={orderCard}
        />
      )}
    </div>
  );
}
