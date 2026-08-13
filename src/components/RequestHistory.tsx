/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { RequestHistoryEntry } from "../types";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Database, 
  CornerDownRight,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface RequestHistoryProps {
  history: RequestHistoryEntry[];
  onClear: () => void;
}

export default function RequestHistory({ history, onClear }: RequestHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = history.length;
    if (total === 0) return { total: 0, successRate: "0%", avgLatency: "0ms", errorCount: 0 };

    const errors = history.filter((h) => h.status === "error").length;
    const successCount = history.filter((h) => h.status === "success").length;
    const successRate = total > 0 ? `${Math.round((successCount / total) * 100)}%` : "0%";

    const latencies = history
      .filter((h) => h.latencyMs !== undefined)
      .map((h) => h.latencyMs as number);
    const avgLatency = latencies.length > 0 
      ? `${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`
      : "0ms";

    return { total, successRate, avgLatency, errorCount: errors };
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-100 rounded-xl border border-neutral-850 overflow-hidden" id="request-history-container">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Automated Request Ledger
          </h2>
        </div>

        <button
          onClick={onClear}
          disabled={history.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg border border-neutral-800 transition disabled:opacity-50 disabled:pointer-events-none"
          id="clear-history-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Ledger
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-neutral-800 bg-neutral-950/20" id="ledger-metrics">
        <div className="p-4 border-r border-neutral-850 flex flex-col justify-between">
          <span className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase font-sans">
            Total Invocations
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-neutral-200 font-mono">
              {stats.total}
            </span>
            <span className="text-xs text-neutral-500">calls</span>
          </div>
        </div>

        <div className="p-4 md:border-r border-neutral-850 flex flex-col justify-between">
          <span className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase font-sans">
            Success Rate
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
              {stats.successRate}
            </span>
            <span className="text-[10px] text-emerald-500/80 px-1.5 py-0.5 rounded bg-emerald-950/25 border border-emerald-900/30 font-medium">
              reliable
            </span>
          </div>
        </div>

        <div className="p-4 border-r border-neutral-850 flex flex-col justify-between">
          <span className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase font-sans">
            Avg. Latency
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-sky-400 font-mono">
              {stats.avgLatency}
            </span>
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
          </div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase font-sans">
            Errors Logged
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-bold tracking-tight font-mono ${stats.errorCount > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
              {stats.errorCount}
            </span>
            {stats.errorCount > 0 && (
              <span className="text-[10px] text-red-500/80 px-1.5 py-0.5 rounded bg-red-950/25 border border-red-900/30 font-medium">
                failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-neutral-900/40">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-neutral-500" id="no-history-msg">
            <Activity className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs">No active requests have been dispatched yet.</p>
            <p className="text-[11px] text-neutral-600 mt-1 max-w-sm text-center">
              Connect to an MCP server and call tools or initiate chatbot conversations to track histories.
            </p>
          </div>
        ) : (
          [...history].reverse().map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-xl border transition ${
                  isExpanded 
                    ? "bg-neutral-950/40 border-neutral-750 shadow-md" 
                    : "bg-neutral-900/80 border-neutral-850 hover:border-neutral-800"
                }`}
                id={`history-item-${entry.id}`}
              >
                {/* Summary bar */}
                <div
                  onClick={() => toggleExpand(entry.id)}
                  className="flex items-center gap-3 p-3.5 cursor-pointer select-none"
                >
                  <div>
                    {entry.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : entry.status === "error" ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      {/* Method label */}
                      <span className="font-mono text-xs font-bold text-neutral-200 uppercase bg-neutral-850 px-2 py-0.5 rounded border border-neutral-800">
                        {entry.method}
                      </span>

                      {/* Summary */}
                      <span className="text-neutral-300 text-sm font-medium truncate flex-1 font-sans">
                        {entry.summary}
                      </span>

                      {/* Time */}
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {entry.timestamp}
                      </span>

                      {/* Latency */}
                      {entry.latencyMs !== undefined && (
                        <span className="text-xs text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                          {entry.latencyMs}ms
                        </span>
                      )}
                    </div>

                    {/* Sub-label showing URL endpoint */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-500 font-mono">
                      <Database className="w-3 h-3" />
                      <span>{entry.endpoint}</span>
                    </div>
                  </div>

                  <div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                </div>

                {/* Collapsible Details Panel */}
                {isExpanded && (
                  <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/30 rounded-b-xl space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* JSON Request Payload */}
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide block mb-1.5 font-sans">
                          ⚡ Request Payload (JSON)
                        </span>
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 overflow-x-auto text-xs font-mono text-sky-300 max-h-64 overflow-y-auto">
                          <pre>{JSON.stringify(entry.details.request, null, 2)}</pre>
                        </div>
                      </div>

                      {/* JSON Response Payload */}
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide block mb-1.5 font-sans">
                          🎯 Response Result (JSON)
                        </span>
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-850 overflow-x-auto text-xs font-mono text-emerald-300 max-h-64 overflow-y-auto">
                          <pre>
                            {entry.details.response 
                              ? JSON.stringify(entry.details.response, null, 2)
                              : `// Pending response or empty payload`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
