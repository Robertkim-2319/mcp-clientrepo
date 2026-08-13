/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { McpTool, McpResource, McpPrompt } from "../types";
import { 
  Wrench, 
  FileText, 
  MessageSquare, 
  Play, 
  HelpCircle, 
  ChevronRight, 
  AlertCircle, 
  Check, 
  Code,
  FileCode,
  ArrowRight,
  Eye,
  Loader2
} from "lucide-react";

interface McpExplorerProps {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  isConnected: boolean;
  onCallTool: (name: string, args: Record<string, any>) => Promise<any>;
  onReadResource: (uri: string) => Promise<any>;
  onGetPrompt: (name: string, args: Record<string, any>) => Promise<any>;
}

export default function McpExplorer({
  tools,
  resources,
  prompts,
  isConnected,
  onCallTool,
  onReadResource,
  onGetPrompt,
}: McpExplorerProps) {
  const [subTab, setSubTab] = useState<"tools" | "resources" | "prompts">("tools");
  
  // Selection States
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<McpPrompt | null>(null);

  // Form Input States
  const [toolInputs, setToolInputs] = useState<Record<string, any>>({});
  const [promptInputs, setPromptInputs] = useState<Record<string, string>>({});

  // Execution Feedback
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Reset work areas when tabs or selections change
  useEffect(() => {
    setSelectedTool(tools[0] || null);
    setSelectedResource(resources[0] || null);
    setSelectedPrompt(prompts[0] || null);
    setExecutionResult(null);
    setExecutionError(null);
  }, [subTab, tools, resources, prompts]);

  useEffect(() => {
    if (selectedTool) {
      const initialInputs: Record<string, any> = {};
      const props = selectedTool.inputSchema?.properties || {};
      Object.entries(props).forEach(([key, value]: [string, any]) => {
        if (value.default !== undefined) {
          initialInputs[key] = value.default;
        } else if (value.type === "boolean") {
          initialInputs[key] = false;
        } else if (value.type === "number" || value.type === "integer") {
          initialInputs[key] = "";
        } else {
          initialInputs[key] = "";
        }
      });
      setToolInputs(initialInputs);
      setExecutionResult(null);
      setExecutionError(null);
    }
  }, [selectedTool]);

  useEffect(() => {
    if (selectedPrompt) {
      const initialInputs: Record<string, string> = {};
      (selectedPrompt.arguments || []).forEach((arg) => {
        initialInputs[arg.name] = "";
      });
      setPromptInputs(initialInputs);
      setExecutionResult(null);
      setExecutionError(null);
    }
  }, [selectedPrompt]);

  const handleToolInputChange = (paramName: string, value: any, type: string) => {
    let castValue = value;
    if (type === "number" || type === "integer") {
      castValue = value === "" ? "" : Number(value);
    } else if (type === "object" || type === "array") {
      // Keep as raw string in state while typing; validate/parse before execution
      castValue = value;
    }
    setToolInputs((prev) => ({ ...prev, [paramName]: castValue }));
  };

  const handleRunTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      // Pre-process inputs (e.g. parse stringified JSON objects/arrays)
      const processedArgs: Record<string, any> = {};
      const props = selectedTool.inputSchema?.properties || {};

      for (const [key, val] of Object.entries(toolInputs)) {
        const paramSchema = props[key] as any;
        if (paramSchema?.type === "object" || paramSchema?.type === "array") {
          if (typeof val === "string" && val.trim() !== "") {
            try {
              processedArgs[key] = JSON.parse(val);
            } catch (jsonErr) {
              throw new Error(`Invalid JSON format for parameter '${key}': ${jsonErr}`);
            }
          }
        } else if (val !== "") {
          processedArgs[key] = val;
        }
      }

      const result = await onCallTool(selectedTool.name, processedArgs);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionError(err.message || String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReadResource = async () => {
    if (!selectedResource) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const result = await onReadResource(selectedResource.uri);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionError(err.message || String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleGeneratePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const result = await onGetPrompt(selectedPrompt.name, promptInputs);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionError(err.message || String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-850 overflow-hidden" id="mcp-explorer-container">
      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-neutral-800 bg-neutral-950 px-4" id="explorer-subtabs">
        <button
          onClick={() => setSubTab("tools")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
            subTab === "tools"
              ? "text-emerald-400 border-emerald-500 bg-neutral-900/40"
              : "text-neutral-400 border-transparent hover:text-neutral-200"
          }`}
          id="tools-tab-btn"
        >
          <Wrench className="w-4 h-4" />
          Tools ({tools.length})
        </button>
        <button
          onClick={() => setSubTab("resources")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
            subTab === "resources"
              ? "text-emerald-400 border-emerald-500 bg-neutral-900/40"
              : "text-neutral-400 border-transparent hover:text-neutral-200"
          }`}
          id="resources-tab-btn"
        >
          <FileText className="w-4 h-4" />
          Resources ({resources.length})
        </button>
        <button
          onClick={() => setSubTab("prompts")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
            subTab === "prompts"
              ? "text-emerald-400 border-emerald-500 bg-neutral-900/40"
              : "text-neutral-400 border-transparent hover:text-neutral-200"
          }`}
          id="prompts-tab-btn"
        >
          <MessageSquare className="w-4 h-4" />
          Prompts ({prompts.length})
        </button>
      </div>

      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500" id="explorer-disconnected-panel">
          <AlertCircle className="w-10 h-10 text-neutral-600 mb-2" />
          <p className="text-sm font-medium text-neutral-400">Offline Workspace Explorer</p>
          <p className="text-xs text-neutral-500 max-w-sm text-center mt-1">
            Please configure and connect to a local or public Model Context Protocol (MCP) server in the settings panel to discover schemas.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0" id="explorer-workspace">
          {/* LEFT COLUMN: List of available capabilities */}
          <div className="lg:col-span-4 border-r border-neutral-850 overflow-y-auto bg-neutral-950/20" id="explorer-sidebar">
            {subTab === "tools" && (
              <div className="p-2 space-y-1">
                {tools.length === 0 ? (
                  <p className="text-xs text-neutral-500 p-4 italic text-center">No tools available.</p>
                ) : (
                  tools.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setSelectedTool(t)}
                      className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition ${
                        selectedTool?.name === t.name
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "border border-transparent hover:bg-neutral-850 text-neutral-300"
                      }`}
                    >
                      <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-bold truncate">{t.name}</p>
                        <p className="text-xs text-neutral-400 font-sans truncate mt-0.5">
                          {t.description || "No description provided"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {subTab === "resources" && (
              <div className="p-2 space-y-1">
                {resources.length === 0 ? (
                  <p className="text-xs text-neutral-500 p-4 italic text-center">No resources available.</p>
                ) : (
                  resources.map((r) => (
                    <button
                      key={r.uri}
                      onClick={() => setSelectedResource(r)}
                      className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition ${
                        selectedResource?.uri === r.uri
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "border border-transparent hover:bg-neutral-850 text-neutral-300"
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{r.name}</p>
                        <p className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                          {r.uri}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {subTab === "prompts" && (
              <div className="p-2 space-y-1">
                {prompts.length === 0 ? (
                  <p className="text-xs text-neutral-500 p-4 italic text-center">No prompt templates available.</p>
                ) : (
                  prompts.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPrompt(p)}
                      className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition ${
                        selectedPrompt?.name === p.name
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "border border-transparent hover:bg-neutral-850 text-neutral-300"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {p.description || "No description provided"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Execution Work Area */}
          <div className="lg:col-span-8 flex flex-col min-h-0 bg-neutral-900/30 overflow-y-auto p-5 space-y-6" id="explorer-workspace-pane">
            
            {/* 1. TOOLS SECTION */}
            {subTab === "tools" && selectedTool && (
              <div className="space-y-6" id="tool-workspace">
                <div>
                  <h3 className="text-lg font-mono font-bold text-neutral-100 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-emerald-400" />
                    {selectedTool.name}
                  </h3>
                  <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed bg-neutral-950/40 p-3 rounded-lg border border-neutral-850">
                    {selectedTool.description || "No description provided for this tool."}
                  </p>
                </div>

                {/* Parameters Form */}
                <form onSubmit={handleRunTool} className="space-y-4">
                  <div className="bg-neutral-950/20 p-4 rounded-xl border border-neutral-850 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-sky-400" />
                      Parameters Schema & Inputs
                    </h4>

                    {Object.keys(selectedTool.inputSchema?.properties || {}).length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">This tool does not require any parameters.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedTool.inputSchema.properties || {}).map(([key, prop]: [string, any]) => {
                          const isRequired = selectedTool.inputSchema?.required?.includes(key);
                          const value = toolInputs[key];

                          return (
                            <div key={key} className={`space-y-1.5 ${prop.type === "object" || prop.type === "array" ? "md:col-span-2" : ""}`}>
                              <label className="flex items-center justify-between text-xs font-mono font-semibold">
                                <span className="text-neutral-200">
                                  {key}
                                  {isRequired && <span className="text-red-400 ml-0.5">*</span>}
                                </span>
                                <span className="text-neutral-500 text-[10px] uppercase font-sans">
                                  {prop.type}
                                </span>
                              </label>

                              {prop.type === "boolean" ? (
                                <div className="flex items-center gap-2 py-2">
                                  <input
                                    type="checkbox"
                                    checked={!!value}
                                    onChange={(e) => handleToolInputChange(key, e.target.checked, prop.type)}
                                    className="w-4 h-4 accent-emerald-500 bg-neutral-900 border-neutral-800 rounded focus:ring-0"
                                    id={`input-${key}`}
                                  />
                                  <span className="text-xs text-neutral-400">Toggle value</span>
                                </div>
                              ) : prop.type === "object" || prop.type === "array" ? (
                                <textarea
                                  placeholder={prop.type === "array" ? '[ "item1", "item2" ]' : '{ "key": "value" }'}
                                  value={value || ""}
                                  onChange={(e) => handleToolInputChange(key, e.target.value, prop.type)}
                                  rows={4}
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 font-mono text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 transition placeholder-neutral-600"
                                  id={`input-${key}`}
                                />
                              ) : (
                                <input
                                  type={prop.type === "number" || prop.type === "integer" ? "number" : "text"}
                                  placeholder={prop.description || ""}
                                  value={value === undefined ? "" : value}
                                  onChange={(e) => handleToolInputChange(key, e.target.value, prop.type)}
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 transition placeholder-neutral-600 font-mono"
                                  id={`input-${key}`}
                                />
                              )}
                              {prop.description && prop.type !== "boolean" && (
                                <p className="text-[10px] text-neutral-500 font-sans leading-tight">
                                  {prop.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isExecuting}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
                    id="execute-tool-btn"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Invoking RPC Tool...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Execute Tool (Call JSON-RPC)
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 2. RESOURCES SECTION */}
            {subTab === "resources" && selectedResource && (
              <div className="space-y-6" id="resource-workspace">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    {selectedResource.name}
                  </h3>
                  <div className="mt-2 text-xs font-mono bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-850 text-sky-400 break-all">
                    URI: {selectedResource.uri}
                  </div>
                  {selectedResource.description && (
                    <p className="text-sm text-neutral-400 mt-2.5 leading-relaxed bg-neutral-950/20 p-3 rounded-lg border border-neutral-850">
                      {selectedResource.description}
                    </p>
                  )}
                  {selectedResource.mimeType && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 mt-3 font-sans">
                      <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                      MimeType: {selectedResource.mimeType}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleReadResource}
                  disabled={isExecuting}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
                  id="read-resource-btn"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reading Resource Payload...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Read Resource Content
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 3. PROMPTS SECTION */}
            {subTab === "prompts" && selectedPrompt && (
              <div className="space-y-6" id="prompt-workspace">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    {selectedPrompt.name}
                  </h3>
                  <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed bg-neutral-950/40 p-3 rounded-lg border border-neutral-850">
                    {selectedPrompt.description || "No description provided for this template."}
                  </p>
                </div>

                {/* Prompt parameters */}
                <form onSubmit={handleGeneratePrompt} className="space-y-4">
                  <div className="bg-neutral-950/20 p-4 rounded-xl border border-neutral-850 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-sky-400" />
                      Template Arguments
                    </h4>

                    {!selectedPrompt.arguments || selectedPrompt.arguments.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">This prompt template has no required arguments.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPrompt.arguments.map((arg) => (
                          <div key={arg.name} className="space-y-1.5">
                            <label className="block text-xs font-mono font-semibold text-neutral-200">
                              {arg.name}
                              {arg.required && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            <input
                              type="text"
                              placeholder={arg.description || ""}
                              value={promptInputs[arg.name] || ""}
                              onChange={(e) => setPromptInputs((prev) => ({ ...prev, [arg.name]: e.target.value }))}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 transition placeholder-neutral-600"
                              required={arg.required}
                              id={`prompt-arg-${arg.name}`}
                            />
                            {arg.description && (
                              <p className="text-[10px] text-neutral-500 font-sans">
                                {arg.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isExecuting}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none"
                    id="get-prompt-btn"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Template...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Compile Prompt Template
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* --- Live Execution Result/Error Area --- */}
            {(executionResult || executionError) && (
              <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 space-y-3" id="explorer-output-card">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Execution Output Console
                  </h4>
                  {executionResult && (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                      <Check className="w-3 h-3" /> SUCCESS
                    </span>
                  )}
                  {executionError && (
                    <span className="flex items-center gap-1 text-[10px] bg-red-950/40 border border-red-900/40 text-red-400 px-2 py-0.5 rounded-full font-medium">
                      <AlertCircle className="w-3 h-3" /> FAILED
                    </span>
                  )}
                </div>

                {executionResult && (
                  <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-850 overflow-x-auto text-xs font-mono text-emerald-400 max-h-80 overflow-y-auto">
                    <pre>{JSON.stringify(executionResult, null, 2)}</pre>
                  </div>
                )}

                {executionError && (
                  <div className="bg-red-950/15 border border-red-900/30 p-3.5 rounded-lg font-mono text-xs text-red-400 leading-relaxed break-all">
                    {executionError}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
