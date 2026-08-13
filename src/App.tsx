/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ConnectionConfig, 
  McpTool, 
  McpResource, 
  McpPrompt, 
  ConsoleLogEntry, 
  RequestHistoryEntry, 
  ChatMessage 
} from "./types";
import ConsoleLogs from "./components/ConsoleLogs";
import RequestHistory from "./components/RequestHistory";
import McpExplorer from "./components/McpExplorer";
import AiChat from "./components/AiChat";
import SettingsPanel from "./components/SettingsPanel";
import { 
  Sparkles, 
  Wrench, 
  Terminal, 
  Activity, 
  Settings, 
  Wifi, 
  WifiOff, 
  Cpu,
  ArrowRight
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"agent" | "explorer" | "console" | "history" | "settings">("settings");

  // Connection Configurations
  const [config, setConfig] = useState<ConnectionConfig>({
    url: "http://127.0.0.1:2319/mcp",
    mode: "direct",
    apiKey: "",
    isCustomHeader: false,
    customHeaderName: "Authorization",
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<{ name: string; version: string } | null>(null);

  // Schema list states
  const [tools, setTools] = useState<McpTool[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);

  // Logs & History stores
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>([]);

  // Chat Agent states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isWaitingForModel, setIsWaitingForModel] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(
    "You are an expert full-stack developer copilot integrated with an MCP environment. Help the user achieve their goals by calling local system tools via Model Context Protocol. Always explain clearly what tools you are using and summarize files or changes elegantly."
  );

  // Auto-clear states on mount & initialize log
  useEffect(() => {
    setConsoleLogs([
      {
        id: "sys_boot",
        timestamp: new Date().toLocaleTimeString(),
        type: "system",
        direction: "none",
        method: "SYSTEM",
        payload: { info: "AI MCP Workspace Client booted successfully. Awaiting connection parameters." },
      },
    ]);
  }, []);

  const getHumanSummary = (method: string, params: any): string => {
    if (method === "initialize") return "Handshake initialization with MCP server";
    if (method === "tools/list") return "Requested active RPC tools list";
    if (method === "resources/list") return "Requested system resources list";
    if (method === "prompts/list") return "Requested prompt templates list";
    if (method === "tools/call") {
      return `Invoked tool '${params?.name}' with parameters: ${JSON.stringify(params?.arguments || {})}`;
    }
    if (method === "resources/read") {
      return `Read system resource URI: ${params?.uri}`;
    }
    if (method === "prompts/get") {
      return `Compiled prompt template '${params?.name}'`;
    }
    return `Dispatched method: ${method}`;
  };

  // Centralized JSON-RPC Dispatcher
  const sendRpc = async (method: string, params: any): Promise<any> => {
    const reqId = `rpc_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toLocaleTimeString();
    const startTime = performance.now();

    const rpcPayload = {
      jsonrpc: "2.0" as const,
      id: reqId,
      method,
      params,
    };

    // 1. Log outgoing request
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `log_out_${reqId}`,
        timestamp,
        type: "request",
        direction: "outgoing",
        method,
        payload: rpcPayload,
      },
    ]);

    const initialHistoryEntry: RequestHistoryEntry = {
      id: reqId,
      timestamp,
      method,
      endpoint: config.url,
      status: "pending",
      summary: getHumanSummary(method, params),
      details: {
        request: rpcPayload,
        response: null,
      },
    };
    setRequestHistory((prev) => [...prev, initialHistoryEntry]);

    try {
      let responseData: any;

      if (config.mode === "direct") {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (config.isCustomHeader && config.customHeaderName && config.apiKey) {
          headers[config.customHeaderName] = config.apiKey;
        }
        const fetchRes = await fetch(config.url, {
          method: "POST",
          headers,
          body: JSON.stringify(rpcPayload),
        });

        if (!fetchRes.ok) {
          throw new Error(`HTTP Error ${fetchRes.status}: ${fetchRes.statusText}`);
        }
        responseData = await fetchRes.json();
      } else {
        // Server proxy mode
        const headers: Record<string, string> = {};
        if (config.isCustomHeader && config.customHeaderName && config.apiKey) {
          headers[config.customHeaderName] = config.apiKey;
        }
        const fetchRes = await fetch("/api/mcp/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: config.url,
            headers,
            body: rpcPayload,
          }),
        });

        const proxyResult = await fetchRes.json();
        if (!fetchRes.ok) {
          throw new Error(proxyResult.message || `Proxy error with status ${fetchRes.status}`);
        }
        responseData = proxyResult.data;
      }

      const latencyMs = Math.round(performance.now() - startTime);

      // Check for JSON-RPC spec errors
      if (responseData?.error) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            id: `log_err_${reqId}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "error",
            direction: "incoming",
            method,
            payload: responseData,
            latencyMs,
          },
        ]);

        setRequestHistory((prev) =>
          prev.map((h) =>
            h.id === reqId
              ? {
                  ...h,
                  status: "error",
                  latencyMs,
                  details: { ...h.details, response: responseData },
                }
              : h
          )
        );

        throw new Error(responseData.error.message || `JSON-RPC error ${responseData.error.code}`);
      }

      // Successful RPC logs
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: `log_res_${reqId}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "response",
          direction: "incoming",
          method,
          payload: responseData,
          latencyMs,
        },
      ]);

      setRequestHistory((prev) =>
        prev.map((h) =>
          h.id === reqId
            ? {
                ...h,
                status: "success",
                latencyMs,
                details: { ...h.details, response: responseData },
              }
            : h
        )
      );

      return responseData?.result;
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: `log_catch_${reqId}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          direction: "incoming",
          method,
          payload: { error: error.message || String(error) },
          latencyMs,
        },
      ]);

      setRequestHistory((prev) =>
        prev.map((h) =>
          h.id === reqId
            ? {
                ...h,
                status: "error",
                latencyMs,
                details: { ...h.details, response: { error: error.message || String(error) } },
              }
            : h
        )
      );

      throw error;
    }
  };

  // Handshake Connection sequence
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    setServerInfo(null);
    setTools([]);
    setResources([]);
    setPrompts([]);

    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `sys_conn_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "system",
        direction: "none",
        method: "SYSTEM",
        payload: { info: "Dispatching MCP initialize payload...", config },
      },
    ]);

    try {
      const initResult = await sendRpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "ai-studio-mcp-client",
          version: "1.0.0",
        },
      });

      if (initResult) {
        setServerInfo({
          name: initResult.serverInfo?.name || "MCP Server",
          version: initResult.serverInfo?.version || "1.0.0",
        });

        // Pull schemas sequentially
        let activeTools: McpTool[] = [];
        try {
          const toolsResult = await sendRpc("tools/list", {});
          activeTools = toolsResult?.tools || [];
          setTools(activeTools);
        } catch (e) {
          console.warn("Could not query tools/list", e);
        }

        let activeResources: McpResource[] = [];
        try {
          const resourcesResult = await sendRpc("resources/list", {});
          activeResources = resourcesResult?.resources || [];
          setResources(activeResources);
        } catch (e) {
          console.warn("Could not query resources/list", e);
        }

        let activePrompts: McpPrompt[] = [];
        try {
          const promptsResult = await sendRpc("prompts/list", {});
          activePrompts = promptsResult?.prompts || [];
          setPrompts(activePrompts);
        } catch (e) {
          console.warn("Could not query prompts/list", e);
        }

        setIsConnected(true);
        setActiveTab("agent"); // Jump to chat automatically once connected

        setConsoleLogs((prev) => [
          ...prev,
          {
            id: `sys_sync_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: "system",
            direction: "none",
            method: "SYSTEM",
            payload: {
              info: "Protocol handshake completed. Active workspace loaded.",
              toolsCount: activeTools.length,
              resourcesCount: activeResources.length,
              promptsCount: activePrompts.length,
            },
          },
        ]);
      } else {
        throw new Error("Handshake returned empty initializing results");
      }
    } catch (err: any) {
      setConnectionError(err.message || String(err));
      setIsConnected(false);
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: `sys_err_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          direction: "none",
          method: "SYSTEM",
          payload: { error: "Handshake handshake abort", details: err.message || String(err) },
        },
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setServerInfo(null);
    setTools([]);
    setResources([]);
    setPrompts([]);
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `sys_disc_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "system",
        direction: "none",
        method: "SYSTEM",
        payload: { info: "Server connection terminated." },
      },
    ]);
  };

  // MCP Execution Wrapper Props
  const handleCallTool = async (name: string, args: Record<string, any>) => {
    return await sendRpc("tools/call", { name, arguments: args });
  };

  const handleReadResource = async (uri: string) => {
    return await sendRpc("resources/read", { uri });
  };

  const handleGetPrompt = async (name: string, args: Record<string, any>) => {
    return await sendRpc("prompts/get", { name, arguments: args });
  };

  // Multi-turn Agentic chat sequence
  const handleSendMessage = async (userText: string) => {
    if (isWaitingForModel) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedHistory = [...chatMessages, userMessage];
    setChatMessages(updatedHistory);
    setIsWaitingForModel(true);

    try {
      await runAgentLoop(updatedHistory);
    } catch (err) {
      console.error("Agent error", err);
    } finally {
      setIsWaitingForModel(false);
    }
  };

  // Recursive multi-turn loop
  const runAgentLoop = async (currentMessages: ChatMessage[], iterationLimit = 5) => {
    if (iterationLimit <= 0) {
      // Exceeded recursion safety depth
      const limitExceededMsg: ChatMessage = {
        id: `msg_limit_${Math.random()}`,
        role: "model",
        content: "I have hit my tool iteration limit to prevent any infinite execution loops. Please let me know how you'd like to proceed next!",
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, limitExceededMsg]);
      return;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: currentMessages,
        mcpTools: tools,
        systemInstruction,
      }),
    });

    if (!res.ok) {
      const errRes = await res.json();
      throw new Error(errRes.message || "Failed to call Chat API");
    }

    const { text, functionCalls } = await res.json();

    // 1. Model returned plain text answer
    if (!functionCalls || functionCalls.length === 0) {
      const responseMsg: ChatMessage = {
        id: `msg_model_${Math.random().toString(36).substr(2, 9)}`,
        role: "model",
        content: text || "Execution successfully processed.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, responseMsg]);
      return;
    }

    // 2. Model returned tool calls
    const modelTurnId = `msg_call_${Math.random().toString(36).substr(2, 9)}`;
    const modelCallMessage: ChatMessage = {
      id: modelTurnId,
      role: "model",
      content: text || "",
      timestamp: new Date().toLocaleTimeString(),
      toolCalls: functionCalls.map((fc: any) => ({
        id: fc.id,
        name: fc.name,
        arguments: fc.arguments,
      })),
    };

    // Update history visually to display tool cards first
    let latestHistory = [...currentMessages, modelCallMessage];
    setChatMessages(latestHistory);

    // Run each tool call requested
    const toolResultsList: any[] = [];
    for (const fc of functionCalls) {
      try {
        const result = await handleCallTool(fc.name, fc.arguments);
        toolResultsList.push({
          id: fc.id,
          name: fc.name,
          result,
        });
      } catch (err: any) {
        toolResultsList.push({
          id: fc.id,
          name: fc.name,
          result: { error: "Failed tool invocation", details: err.message || String(err) },
        });
      }
    }

    // Append tool responses as standard Gemini parts
    const toolResponses: ChatMessage[] = toolResultsList.map((tr) => ({
      id: modelTurnId, // Paired with model turn id
      role: "tool",
      name: tr.name,
      content: JSON.stringify(tr.result),
      timestamp: new Date().toLocaleTimeString(),
      result: tr.result,
    }));

    latestHistory = [...latestHistory, ...toolResponses];
    setChatMessages(latestHistory);

    // Recursively call agent to generate final text or perform another tool iteration
    await runAgentLoop(latestHistory, iterationLimit - 1);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden" id="mcp-app-workspace">
      
      {/* MOBILE HEADER: Only visible on mobile (md:hidden) */}
      <header className="md:hidden bg-neutral-950 border-b border-neutral-850 px-4 py-3 flex items-center justify-between z-40 shrink-0" id="mobile-header">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h1 className="font-bold text-xs uppercase tracking-wider text-neutral-100">
              AI MCP Client
            </h1>
            <p className="text-[8px] text-neutral-500 font-mono">MT MANAGER COMPATIBLE</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <span className="flex items-center gap-1 text-[9px] bg-emerald-950 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              CONNECTED
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] bg-neutral-800 border border-neutral-700 text-neutral-400 px-2 py-0.5 rounded-full font-medium">
              OFFLINE
            </span>
          )}
        </div>
      </header>

      {/* 1. LEFT SIDEBAR: Layout Controls (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-neutral-950 border-r border-neutral-850 flex-col justify-between shrink-0" id="main-sidebar">
        <div>
          {/* Brand Logo & Name */}
          <div className="p-5 border-b border-neutral-850 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <div>
              <h1 className="font-bold text-sm tracking-wide uppercase text-neutral-100">
                AI MCP Client
              </h1>
              <p className="text-[10px] text-neutral-500 font-medium uppercase font-mono">
                Model Context Protocol
              </p>
            </div>
          </div>

          {/* Quick Connection Status Banner */}
          <div className="px-4 py-3 border-b border-neutral-850 bg-neutral-950/40">
            {isConnected ? (
              <div className="flex items-center gap-2.5 text-xs text-emerald-400">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <div className="min-w-0">
                  <p className="font-bold truncate text-[11px] uppercase tracking-wide">Connected</p>
                  <p className="text-[10px] text-neutral-400 truncate">{serverInfo?.name || "Local Server"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-neutral-400">
                <WifiOff className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="font-bold text-[11px] uppercase tracking-wide">Offline</p>
                  <p className="text-[10px] text-neutral-500">Handshake incomplete</p>
                </div>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1" id="sidebar-nav">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "settings"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                Settings & Auth
              </span>
            </button>

            <button
              onClick={() => setActiveTab("agent")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "agent"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                AI Copilot Chat
              </span>
            </button>

            <button
              onClick={() => setActiveTab("explorer")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "explorer"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4" />
                MCP Schema Explorer
              </span>
              {isConnected && tools.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950 border border-emerald-900/45 text-emerald-400 rounded-md font-mono font-bold">
                  {tools.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("console")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "console"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4" />
                Real-Time Console
              </span>
              {consoleLogs.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-md font-mono">
                  {consoleLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === "history"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                Request Ledger
              </span>
              {requestHistory.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-md font-mono">
                  {requestHistory.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Footer Credit */}
        <div className="p-4 border-t border-neutral-850 text-center bg-neutral-950/20">
          <p className="text-[10px] text-neutral-500 font-sans tracking-wide">
            Model Context Protocol Client v1.0.0
          </p>
        </div>
      </aside>

      {/* 2. MAIN VIEW AREA */}
      <main className="flex-1 flex flex-col p-3 md:p-4 pb-20 md:pb-4 overflow-hidden" id="main-view-viewport">
        {activeTab === "settings" && (
          <SettingsPanel
            config={config}
            onConfigChange={setConfig}
            isConnected={isConnected}
            isConnecting={isConnecting}
            connectionError={connectionError}
            serverInfo={serverInfo}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}

        {activeTab === "agent" && (
          <AiChat
            messages={chatMessages}
            mcpTools={tools}
            isWaitingForModel={isWaitingForModel}
            systemInstruction={systemInstruction}
            onSystemInstructionChange={setSystemInstruction}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
          />
        )}

        {activeTab === "explorer" && (
          <McpExplorer
            tools={tools}
            resources={resources}
            prompts={prompts}
            isConnected={isConnected}
            onCallTool={handleCallTool}
            onReadResource={handleReadResource}
            onGetPrompt={handleGetPrompt}
          />
        )}

        {activeTab === "console" && (
          <ConsoleLogs
            logs={consoleLogs}
            onClear={() => setConsoleLogs([])}
          />
        )}

        {activeTab === "history" && (
          <RequestHistory
            history={requestHistory}
            onClear={() => setRequestHistory([])}
          />
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION: Fixed touch bar for portrait phone layout (md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-950 border-t border-neutral-850 flex items-center justify-around px-2 z-50 shadow-xl" id="mobile-bottom-nav">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition ${
            activeTab === "settings" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-500"
          }`}
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-semibold tracking-tight mt-1 uppercase">Config</span>
        </button>

        <button
          onClick={() => setActiveTab("agent")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition ${
            activeTab === "agent" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-500"
          }`}
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-semibold tracking-tight mt-1 uppercase">Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition relative ${
            activeTab === "explorer" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-500"
          }`}
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[9px] font-semibold tracking-tight mt-1 uppercase">Explore</span>
          {isConnected && tools.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-neutral-950 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("console")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition relative ${
            activeTab === "console" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-500"
          }`}
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[9px] font-semibold tracking-tight mt-1 uppercase">Logs</span>
          {consoleLogs.length > 0 && (
            <span className="absolute top-1 right-1 px-1 py-0.5 bg-emerald-500 text-neutral-950 text-[7px] font-bold rounded-md font-mono scale-90">
              {consoleLogs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition ${
            activeTab === "history" ? "text-emerald-400 bg-emerald-500/10" : "text-neutral-500"
          }`}
          style={{ minWidth: "44px", minHeight: "44px" }}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[9px] font-semibold tracking-tight mt-1 uppercase">Ledger</span>
        </button>
      </nav>
    </div>
  );
}
