"use client";

import { useEffect, useState, useCallback } from "react";

interface AgentLog {
  agent: string;
  message: string;
  timestamp: string;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTreasurer, setRunningTreasurer] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/logs");
      const data = await res.json();
      setLogs((data.logs || []).reverse());
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const runTreasurer = async () => {
    setRunningTreasurer(true);
    try {
      await fetch("/api/agent/treasurer", { method: "POST" });
      await fetchLogs();
    } catch (err) {
      console.error("Treasurer error:", err);
    } finally {
      setRunningTreasurer(false);
    }
  };

  const agentColor = (agent: string) => {
    switch (agent) {
      case "treasurer":
        return "text-emerald-600";
      case "seller":
        return "text-blue-600";
      default:
        return "text-purple-600";
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Agent Activity</h2>
        <button
          onClick={runTreasurer}
          disabled={runningTreasurer}
          className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 disabled:opacity-50 font-medium transition-colors"
        >
          {runningTreasurer ? "Running..." : "Run Treasurer"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-50 rounded p-2 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-2.5 bg-gray-100 rounded w-14" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 bg-gray-100 rounded w-full" />
                <div className="h-2.5 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-gray-300 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 15.75 4.5h-9A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5Zm.75-12h7.5v7.5h-7.5V7.5Z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 mb-1">No agent activity yet</p>
          <p className="text-xs text-gray-400">Your agents will post activity updates here</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded p-2 border border-gray-100 text-xs"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`font-semibold capitalize ${agentColor(log.agent)}`}>
                  {log.agent}
                </span>
                <span className="text-gray-300">{formatTime(log.timestamp)}</span>
              </div>
              <p className="text-gray-600 leading-relaxed">{log.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
