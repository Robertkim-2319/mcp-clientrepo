/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ConsoleLogEntry, LogType } from "../types";
import { 
  Terminal, 
  Trash2, 
  Copy, 
  Download, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface ConsoleLogsProps {
  logs: ConsoleLogEntry[];
  onClear: () => void;
}

export default function ConsoleLogs({ logs, onClear }: ConsoleLogsProps) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<LogType | "all">("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesType = selectedType === "all" || log.type === selectedType;
      const jsonStr = JSON.stringify(log.payload || {}).toLowerCase();
      const matchesSearch = 
        log.method.toLowerCase().includes(search.toLowerCase()) ||
        jsonStr.includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [logs, search, selectedType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mcp_client_console_${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPayload = (payload: any) => {
    if (!payload) return null;
    return (
      <div className="mt-2 bg-neutral-950 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-neutral-800 text-neutral-300">
        <pre className="whitespace-pre-wrap word-break-all max-h-60 overflow-y-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-100 rounded-xl border border-neutral-850 overflow-hidden" id="console-logs-container">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Real-Time Console Logs
          </h2>
          <span className="px-2 py-0.5 text-xs bg-neutral-800 rounded-full font-mono text-neutral-400">
            {filteredLogs.length} / {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 rounded-lg transition disabled:opacity-50 disabled:pointer-events-none"
            title="Download log file"
            id="download-logs-btn"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition disabled:opacity-50 disabled:pointer-events-none"
            title="Clear all logs"
            id="clear-logs-btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-neutral-950/50 border-b border-neutral-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search payload or method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition font-sans placeholder-neutral-500"
            id="log-search-input"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0" id="log-filters">
          {(["all", "request", "response", "error", "system"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition whitespace-nowrap ${
                selectedType === type
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-850"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-900/90 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-500" id="no-logs-msg">
            <Terminal className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No console logs match current filters.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = !!expandedIds[log.id];

            // Setup styling variables
            let typeColor = "text-neutral-400 bg-neutral-800/50";
            let icon = <Info className="w-3.5 h-3.5 text-neutral-400" />;

            if (log.type === "request") {
              typeColor = "text-sky-400 bg-sky-950/30 border-sky-900/40";
              icon = <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />;
            } else if (log.type === "response") {
              typeColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/40";
              icon = <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />;
            } else if (log.type === "error") {
              typeColor = "text-red-400 bg-red-950/30 border-red-900/40";
              icon = <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
            } else if (log.type === "system") {
              typeColor = "text-purple-400 bg-purple-950/30 border-purple-900/40";
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />;
            }

            return (
              <div
                key={log.id}
                className={`p-3 rounded-lg border transition ${
                  log.type === "error" 
                    ? "border-red-950 bg-red-950/5 hover:bg-red-950/10" 
                    : isExpanded 
                    ? "border-neutral-800 bg-neutral-950/40" 
                    : "border-neutral-850 hover:bg-neutral-850/30 bg-neutral-900"
                }`}
                id={`log-item-${log.id}`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex items-start gap-3 cursor-pointer select-none"
                >
                  <div className="pt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Timestamp */}
                      <span className="text-[11px] text-neutral-500 font-sans font-mono font-medium">
                        [{log.timestamp}]
                      </span>

                      {/* Direction/Type pill */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold uppercase border ${typeColor}`}>
                        {icon}
                        {log.type}
                      </span>

                      {/* Method */}
                      <span className="font-bold text-neutral-200 text-xs sm:text-sm break-all font-mono">
                        {log.method}
                      </span>

                      {/* Latency badge */}
                      {log.latencyMs !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[11px] text-neutral-400 border border-neutral-700">
                          {log.latencyMs}ms
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(JSON.stringify(log.payload, null, 2));
                    }}
                    className="p-1 text-neutral-500 hover:text-neutral-300 rounded transition"
                    title="Copy payload"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collapsible details */}
                {isExpanded && (
                  <div className="mt-3 pl-7 border-l border-neutral-850 space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-neutral-500 font-sans">
                      <span>Log ID: {log.id}</span>
                      <span>JSON-RPC Format</span>
                    </div>
                    {renderPayload(log.payload)}
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
