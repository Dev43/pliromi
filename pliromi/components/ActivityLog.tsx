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
        <div className="text-center text-gray-400 py-4">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">
          No agent activity yet. Run the treasurer to see logs.
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
