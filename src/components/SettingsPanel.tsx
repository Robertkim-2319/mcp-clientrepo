/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ConnectionConfig } from "../types";
import { 
  Database, 
  Settings, 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Globe, 
  ShieldAlert, 
  Key, 
  BookOpen, 
  Terminal, 
  ExternalLink,
  ChevronRight,
  Info,
  Loader2
} from "lucide-react";

interface SettingsPanelProps {
  config: ConnectionConfig;
  onConfigChange: (newConfig: ConnectionConfig) => void;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  serverInfo: { name: string; version: string } | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
}

export default function SettingsPanel({
  config,
  onConfigChange,
  isConnected,
  isConnecting,
  connectionError,
  serverInfo,
  onConnect,
  onDisconnect,
}: SettingsPanelProps) {
  const [showGuide, setShowGuide] = useState(true);

  const handleFieldChange = (field: keyof ConnectionConfig, value: any) => {
    onConfigChange({
      ...config,
      [field]: value,
    });
  };

  const handleTestConnect = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-850 overflow-hidden" id="settings-panel-container">
      {/* Header Panel */}
      <div className="flex items-center justify-between p-4 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            MCP Protocol Configurator
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-[11px] bg-emerald-950 border border-emerald-900/50 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-400 px-2.5 py-0.5 rounded-full font-medium">
              DISCONNECTED
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto" id="settings-layout">
        {/* LEFT PANEL: Connection Form */}
        <div className="lg:col-span-6 p-5 border-r border-neutral-850 space-y-6 overflow-y-auto">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Quick Connection Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onConfigChange({
                    ...config,
                    url: "/api/mcp/builtin",
                    mode: "proxy",
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  config.url === "/api/mcp/builtin"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                }`}
              >
                <span className="text-[11px] font-bold flex items-center gap-1 text-emerald-400">
                  <Database className="w-3.5 h-3.5 shrink-0" /> Built-in Sandbox
                </span>
                <span className="text-[9px] opacity-75 mt-1">Instant Android/MT simulation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfigChange({
                    ...config,
                    url: "http://127.0.0.1:2319/mcp",
                    mode: "direct",
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  config.url.includes("127.0.0.1") && config.mode === "direct"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                }`}
              >
                <span className="text-[11px] font-bold flex items-center gap-1 text-sky-400">
                  <Globe className="w-3.5 h-3.5 shrink-0" /> Phone Localhost
                </span>
                <span className="text-[9px] opacity-75 mt-1">Direct port 2319 on device</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfigChange({
                    ...config,
                    url: "https://5ee9c3827c79ba.lhr.life",
                    mode: "direct",
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  config.url.includes("lhr.life")
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                }`}
              >
                <span className="text-[11px] font-bold flex items-center gap-1 text-purple-400">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Termux Tunnel
                </span>
                <span className="text-[9px] opacity-75 mt-1">localhost.run HTTPS (Live)</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleTestConnect} className="space-y-4">
            
            {/* Server Endpoint URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                MCP Server Endpoint
              </label>
              <div className="relative">
                <Database className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. /api/mcp/builtin or http://127.0.0.1:2319/mcp"
                  value={config.url}
                  onChange={(e) => handleFieldChange("url", e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-200 font-mono focus:outline-none focus:border-emerald-500 transition"
                  id="mcp-server-url-input"
                />
              </div>
              <p className="text-[10px] text-neutral-500 leading-normal">
                Use <code className="text-emerald-400 font-mono">/api/mcp/builtin</code> for instant MT Manager testing, or <code className="text-sky-400 font-mono">http://127.0.0.1:2319/mcp</code> for your local device.
              </p>
            </div>

            {/* Connection mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Connection Transport Mode
              </label>
              <div className="grid grid-cols-2 gap-2" id="transport-mode-selection">
                <button
                  type="button"
                  onClick={() => handleFieldChange("mode", "direct")}
                  className={`p-3 rounded-xl border text-left transition ${
                    config.mode === "direct"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-750 text-neutral-400"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Direct Browser
                  </p>
                  <p className="text-[9px] mt-1 opacity-70">
                    Browser fetches directly to device localhost.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleFieldChange("mode", "proxy")}
                  className={`p-3 rounded-xl border text-left transition ${
                    config.mode === "proxy"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-neutral-950/40 border-neutral-800 hover:border-neutral-750 text-neutral-400"
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Server Proxy
                  </p>
                  <p className="text-[9px] mt-1 opacity-70">
                    Bypasses CORS. Works for Built-in sandbox & ngrok.
                  </p>
                </button>
              </div>
            </div>

            {/* Custom Authentication and Headers */}
            <div className="bg-neutral-950/30 border border-neutral-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                Headers & API Authentication
              </h4>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.isCustomHeader}
                  onChange={(e) => handleFieldChange("isCustomHeader", e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 bg-neutral-900 border-neutral-800 rounded focus:ring-0"
                  id="custom-header-checkbox"
                />
                <span className="text-xs text-neutral-400">Attach custom auth/header</span>
              </div>

              {config.isCustomHeader && (
                <div className="space-y-3.5 pt-2 border-t border-neutral-850">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono font-medium text-neutral-400">
                      Header Key Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. X-API-Key or Authorization"
                      value={config.customHeaderName}
                      onChange={(e) => handleFieldChange("customHeaderName", e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono focus:outline-none"
                      id="custom-header-name-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono font-medium text-neutral-400">
                      API Key / Credentials Token
                    </label>
                    <input
                      type="password"
                      placeholder="Enter token payload"
                      value={config.apiKey}
                      onChange={(e) => handleFieldChange("apiKey", e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono focus:outline-none"
                      id="custom-header-key-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Connection Actions */}
            <div className="flex gap-2 pt-2">
              {isConnected ? (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="w-full py-2.5 px-4 bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 text-red-400 font-bold text-sm rounded-xl transition"
                  id="disconnect-mcp-btn"
                >
                  Terminate Connection
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
                  id="connect-mcp-btn"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Performing Handshake...
                    </>
                  ) : (
                    "Initialize & Fetch Schemas"
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Connection Diagnosis Results */}
          {(connectionError || serverInfo) && (
            <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 space-y-3" id="diagnosis-panel">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Connection Diagnostics
              </h4>

              {serverInfo && (
                <div className="flex items-start gap-3 p-3 bg-emerald-950/15 border border-emerald-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1 leading-normal">
                    <p className="font-bold text-emerald-400">Handshake Successful</p>
                    <p className="text-neutral-400"><span className="font-semibold text-neutral-300">Server Identity:</span> {serverInfo.name}</p>
                    <p className="text-neutral-400"><span className="font-semibold text-neutral-300">Version:</span> {serverInfo.version}</p>
                    <p className="text-neutral-500 text-[10px]">Active schemas successfully parsed and locked into workspace context.</p>
                  </div>
                </div>
              )}

              {connectionError && (
                <div className="flex items-start gap-3 p-3 bg-red-950/15 border border-red-900/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-2.5 leading-normal w-full">
                    <p className="font-bold text-red-400">Handshake Failed</p>
                    <p className="text-neutral-300 font-mono text-[11px] whitespace-pre-line break-words">{connectionError}</p>
                    
                    {/* Quick Recovery One-Click Actions */}
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Quick Fix Options:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onConfigChange({
                              ...config,
                              url: "/api/mcp/builtin",
                              mode: "proxy",
                            });
                            setTimeout(() => {
                              onConnect();
                            }, 50);
                          }}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Database className="w-3.5 h-3.5" /> Use Built-in MT Sandbox
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onConfigChange({
                              ...config,
                              mode: "direct",
                            });
                            setTimeout(() => {
                              onConnect();
                            }, 50);
                          }}
                          className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Globe className="w-3.5 h-3.5" /> Switch to Direct Browser Mode
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: User/Developer Guides */}
        <div className="lg:col-span-6 p-5 space-y-5 overflow-y-auto bg-neutral-950/30">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              Developer Playbook & Setup
            </h3>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              {showGuide ? "Minimize Guide" : "Maximize Guide"}
            </button>
          </div>

          {showGuide && (
            <div className="space-y-4 text-neutral-300 text-sm leading-relaxed" id="guide-contents">
              
              {/* How to run local MCP */}
              <div className="space-y-2 p-4 bg-neutral-950/50 rounded-xl border border-neutral-850">
                <p className="font-bold text-xs text-neutral-100 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  1. Run a Local File-System MCP Server
                </p>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  You can expose your local files to this client app using Anthropic's official file system server. Open your terminal and run:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 font-mono text-[11px] text-sky-300 flex justify-between items-center overflow-x-auto">
                  <code>npx -y @modelcontextprotocol/server-filesystem /path/to/your/workspace</code>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Ensure the path provided is absolute (e.g. `/Users/username/project` or `C:\Users\username\project`).
                </p>
              </div>

              {/* Android & MT Manager Integration */}
              <div className="space-y-2.5 p-4 bg-emerald-950/15 rounded-xl border border-emerald-900/30">
                <p className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Android & MT Manager (2026) MCP Sync
                </p>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  On Android devices, you can run the MCP server directly using <strong>Termux</strong> or connect to MT Manager's built-in MCP engine:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded">
                    <p className="font-bold text-[11px] text-neutral-200">Option A: Termux File Server</p>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      Install Node.js inside Termux (<code className="text-sky-300">pkg install nodejs</code>), grant storage permissions, and start the filesystem server pointing to your workspace or external SD card:
                    </p>
                    <code className="block mt-1.5 p-1.5 bg-neutral-950 rounded text-sky-400 font-mono text-[10px] overflow-x-auto">
                      npx -y @modelcontextprotocol/server-filesystem /sdcard/Documents
                    </code>
                  </div>
                  <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded">
                    <p className="font-bold text-[11px] text-neutral-200">Option B: MT Manager Built-In Client</p>
                    <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      Toggle MT Manager's internal MCP Protocol client tool to port <code className="text-emerald-400">2319</code>, select <strong>Server Proxy</strong> mode on this dashboard to bypass browser CORS blocks, and connect flawlessly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting CORS / Sandbox Blocks */}
              <div className="space-y-2.5 p-4 bg-neutral-950/50 rounded-xl border border-neutral-850">
                <p className="font-bold text-xs text-neutral-100 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  2. Handling Localhost CORS Blocks
                </p>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Modern browsers block client-side fetch requests from an online HTTPS dashboard (this app) to an unencrypted HTTP localhost address (`http://127.0.0.1:2319`) due to strict **CORS (Cross-Origin Resource Sharing)** and **Mixed Content** policies.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                    <p className="font-bold text-[11px] text-neutral-300">Solution A: Use Ngrok Tunnel (Easiest & Securest)</p>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Run `ngrok http 2319` on your computer, paste the public ngrok URL (e.g. `https://xxxx.ngrok-free.app/mcp`) in the URL field, set transport to **Server Proxy**, and connect! This works 100% without browser security interference.
                    </p>
                  </div>
                  <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                    <p className="font-bold text-[11px] text-neutral-300">Solution B: Browser CORS Extension</p>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Install a web extension like **"Allow CORS: Access-Control-Allow-Origin"**, toggle it on in your browser, set connection to **Direct Browser**, and connect to localhost directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Protocol Spec Overview */}
              <div className="space-y-2 p-4 bg-neutral-950/50 rounded-xl border border-neutral-850 text-xs">
                <p className="font-bold text-xs text-neutral-100 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-400" />
                  3. JSON-RPC Protocol Handshake Specs
                </p>
                <p className="text-neutral-400 leading-relaxed font-sans">
                  The client utilizes the Model Context Protocol (v2024-11-05). During initialization, the client issues an `initialize` JSON-RPC method, passing capabilities, protocol version, and client details, expecting the server to list its available schemas:
                </p>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                  <pre>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "ai-studio-mcp-client",
      "version": "1.0.0"
    }
  }
}`}</pre>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
