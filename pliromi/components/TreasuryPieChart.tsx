"use client";

import { useEffect, useState, useCallback } from "react";

interface WalletAccount {
  chainName: string;
  usdcBalance?: string;
}

interface Slice {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const CHAIN_COLORS: Record<string, string> = {
  Base: "#0052FF",
  Ethereum: "#627EEA",
  Polygon: "#8247E5",
  Arbitrum: "#28A0F0",
  Solana: "#9945FF",
  Lulo: "#10B981",
  Bitcoin: "#F7931A",
  Cosmos: "#2E3148",
  Tron: "#FF0013",
  TON: "#0098EA",
  Filecoin: "#0090FF",
  Sui: "#6FBCF0",
};

function PieChart({ slices }: { slices: Slice[] }) {
  if (slices.length === 0) return null;

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 60;
  const innerRadius = 38;

  let cumulativeAngle = -90; // Start from top

  const paths = slices.map((slice) => {
    const startAngle = cumulativeAngle;
    const sweepAngle = (slice.percentage / 100) * 360;
    cumulativeAngle += sweepAngle;
    const endAngle = startAngle + sweepAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const ix1 = cx + innerRadius * Math.cos(startRad);
    const iy1 = cy + innerRadius * Math.sin(startRad);
    const ix2 = cx + innerRadius * Math.cos(endRad);
    const iy2 = cy + innerRadius * Math.sin(endRad);

    const largeArc = sweepAngle > 180 ? 1 : 0;

    // Full circle edge case
    if (sweepAngle >= 359.99) {
      return (
        <g key={slice.label}>
          <circle cx={cx} cy={cy} r={radius} fill={slice.color} />
          <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
        </g>
      );
    }

    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    return <path key={slice.label} d={d} fill={slice.color} />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  );
}

export default function TreasuryPieChart() {
  const [slices, setSlices] = useState<Slice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, luloRes] = await Promise.all([
        fetch("/api/wallet/balances"),
        fetch("/api/lulo"),
      ]);
      const data = await balRes.json();
      const accounts: WalletAccount[] = data.accounts || [];

      // Aggregate USDC by chain
      const chainTotals: Record<string, number> = {};
      let totalUsdc = 0;

      for (const acc of accounts) {
        const bal = parseFloat(acc.usdcBalance || "0");
        if (bal > 0) {
          const name = acc.chainName;
          chainTotals[name] = (chainTotals[name] || 0) + bal;
          totalUsdc += bal;
        }
      }

      // Add Lulo position
      try {
        const luloData = await luloRes.json();
        if (luloData.lulo?.balance > 0) {
          chainTotals["Lulo"] = luloData.lulo.balance;
          totalUsdc += luloData.lulo.balance;
        }
      } catch { /* no lulo data */ }

      setTotal(totalUsdc);

      if (totalUsdc === 0) {
        setSlices([]);
        setLoading(false);
        return;
      }

      const sorted = Object.entries(chainTotals)
        .map(([label, value]) => ({
          label,
          value,
          percentage: (value / totalUsdc) * 100,
          color: CHAIN_COLORS[label] || "#94a3b8",
        }))
        .sort((a, b) => b.value - a.value);

      setSlices(sorted);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Allocation</h2>
        <div className="text-center text-gray-400 py-6 text-sm">Loading...</div>
      </div>
    );
  }

  if (slices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Allocation</h2>
        <div className="text-center text-gray-400 py-6 text-sm">No USDC balances found</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Allocation</h2>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <PieChart slices={slices} />
        </div>

        <div className="flex-1 space-y-1.5">
          {slices.map((slice) => (
            <div key={slice.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-gray-700 font-medium">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">${slice.value.toFixed(2)}</span>
                <span className="text-gray-900 font-semibold w-12 text-right">
                  {slice.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Total</span>
            <span className="text-gray-900 font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
