"use client";

import { useEffect, useState, useCallback } from "react";

interface Sale {
  id: string;
  productId: string;
  price: number;
  chain: string;
  txHash: string;
  timestamp: string;
}

interface DayData {
  label: string;
  total: number;
  count: number;
}

export default function SalesChart() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayData[]>([]);

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      setSales(data.sales || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Aggregate sales by day (last 7 days)
  useEffect(() => {
    const now = new Date();
    const dayMap: Record<string, DayData> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = {
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        total: 0,
        count: 0,
      };
    }

    for (const sale of sales) {
      const key = sale.timestamp.slice(0, 10);
      if (dayMap[key]) {
        dayMap[key].total += sale.price;
        dayMap[key].count += 1;
      }
    }

    setDays(Object.values(dayMap));
  }, [sales]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.price, 0);
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales</h2>
          <p className="text-xs text-gray-400">Last 7 days</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              ${totalRevenue.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-400">
              {sales.length} sale{sales.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchSales(); }}
            className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Refresh sales"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.465l.312.31H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.535a.75.75 0 00-1.5 0v2.033l-.312-.311A7 7 0 002.63 8.395a.75.75 0 001.45.39z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-6 text-sm">Loading...</div>
      ) : sales.length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">
          No sales yet. Sell your first product!
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-32 mb-2">
            {days.map((day, i) => {
              const height = day.total > 0 ? (day.total / maxDay) * 100 : 2;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    {day.total > 0 && (
                      <span className="text-[9px] text-emerald-600 font-semibold mb-0.5">
                        ${day.total.toFixed(0)}
                      </span>
                    )}
                    <div
                      className={`w-full max-w-[32px] rounded-t-md transition-all ${
                        day.total > 0 ? "bg-emerald-500" : "bg-gray-100"
                      }`}
                      style={{ height: `${height}%`, minHeight: "2px" }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{day.label}</span>
                </div>
              );
            })}
          </div>

          {/* Chain breakdown */}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(
                sales.reduce<Record<string, { count: number; total: number }>>(
                  (acc, s) => {
                    const c = s.chain || "unknown";
                    if (!acc[c]) acc[c] = { count: 0, total: 0 };
                    acc[c].count += 1;
                    acc[c].total += s.price;
                    return acc;
                  },
                  {}
                )
              )
                .sort((a, b) => b[1].total - a[1].total)
                .map(([chain, data]) => (
                  <div key={chain} className="flex items-center gap-1 text-xs">
                    <span className="capitalize font-medium text-gray-600">
                      {chain}
                    </span>
                    <span className="text-gray-400">
                      ${data.total.toFixed(2)} ({data.count})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
