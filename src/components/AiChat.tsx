/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, McpTool } from "../types";
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Wrench, 
  Settings, 
  Info, 
  CornerDownRight, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Plus
} from "lucide-react";

interface AiChatProps {
  messages: ChatMessage[];
  mcpTools: McpTool[];
  isWaitingForModel: boolean;
  systemInstruction: string;
  onSystemInstructionChange: (val: string) => void;
  onSendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
}

export default function AiChat({
  messages,
  mcpTools,
  isWaitingForModel,
  systemInstruction,
  onSystemInstructionChange,
  onSendMessage,
  isConnected,
}: AiChatProps) {
  const [input, setInput] = useState("");
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaitingForModel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isWaitingForModel) return;

    const messageContent = input;
    setInput("");
    await onSendMessage(messageContent);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isWaitingForModel) return;
    await onSendMessage(suggestion);
  };

  const suggestions = [
    { text: "List your active tools", desc: "Show what capabilities you can execute" },
    { text: "Can you read my index.html file?", desc: "Test filesystem read tools" },
    { text: "Write 'Hello MCP World' to testing.txt", desc: "Test filesystem write tools" },
    { text: "Check system state and health", desc: "Inquire about connection status" },
  ];

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-850 overflow-hidden" id="ai-chat-container">
      {/* Thread Header */}
      <div className="flex items-center justify-between p-4 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400 fill-emerald-400/25" />
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
              Gemini Co-Developer Agent
            </h2>
            <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
              {isConnected 
                ? `Armed with ${mcpTools.length} live local tools via Model Context Protocol` 
                : "Awaiting local MCP connection settings..."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSystemSettings(!showSystemSettings)}
          className={`p-2 rounded-lg border transition ${
            showSystemSettings 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
          title="System Instructions Overrides"
          id="toggle-system-settings-btn"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsible System Instruction Panel */}
      {showSystemSettings && (
        <div className="p-4 bg-neutral-950/70 border-b border-neutral-800 space-y-2" id="system-settings-panel">
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            System Directive (Gemini Instructions)
          </label>
          <textarea
            value={systemInstruction}
            onChange={(e) => onSystemInstructionChange(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-sans focus:outline-none focus:border-emerald-500 transition min-h-24 leading-relaxed"
            placeholder="Instruct the agent on how to behave, what tools to write, or constraints to respect..."
            id="system-instruction-textarea"
          />
          <p className="text-[10px] text-neutral-500 leading-tight">
            These guidelines prime the Gemini model's reasoning loop. You can modify this to enforce safety, specify coding preferences, or instruct the agent on which MCP tool families to prefer first.
          </p>
        </div>
      )}

      {/* Chat Messages viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/40" id="chat-messages-viewport">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center py-10" id="empty-chat-welcome">
            <Bot className="w-12 h-12 text-emerald-400 mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-neutral-200">Meet your local MCP AI Copilot</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              This terminal connects the Gemini model directly to your system tools over Model Context Protocol. Once connected, you can issue conversational prompts to read/write files, inspect directories, run shell scripts, or execute queries.
            </p>

            {/* Suggestions bubbles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-6 text-left">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(s.text)}
                  className="p-2.5 bg-neutral-950/50 hover:bg-neutral-950 border border-neutral-850 hover:border-neutral-750 rounded-xl text-left transition group"
                  id={`suggestion-btn-${idx}`}
                >
                  <p className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 font-sans">
                    {s.text}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 truncate font-sans">
                    {s.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const isTool = msg.role === "tool";

            if (isTool) return null; // We render tool calls and results inline inside the model message!

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                id={`chat-msg-${msg.id}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isUser 
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                    : "bg-neutral-950 border-neutral-800 text-neutral-300"
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble Content */}
                <div className="space-y-2">
                  <div className={`rounded-2xl p-3.5 text-sm leading-relaxed border ${
                    isUser 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-neutral-100 rounded-tr-none" 
                      : "bg-neutral-950 border-neutral-850 text-neutral-100 rounded-tl-none shadow-sm"
                  }`}>
                    {/* Timestamp / Name line */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-1 font-sans">
                      <span>{isUser ? "You" : "AI Copilot"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-wrap font-sans break-words selection:bg-emerald-500/30 selection:text-neutral-100">
                      {msg.content}
                    </div>
                  </div>

                  {/* Inline Tool calls inside Model outputs */}
                  {msg.toolCalls && msg.toolCalls.map((tc, index) => {
                    const resultMsg = messages.find(
                      (m) => m.role === "tool" && m.id === msg.id // Look for result paired with this message turn
                    );
                    
                    const isSuccess = resultMsg && !resultMsg.content.includes('"error"');

                    return (
                      <div
                        key={tc.id}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 space-y-2.5 max-w-md shadow-inner"
                        id={`inline-tool-call-${tc.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
                            <Wrench className="w-3.5 h-3.5 animate-pulse" />
                            <span>Calling: {tc.name}</span>
                          </div>

                          {/* Status Badge */}
                          {resultMsg ? (
                            isSuccess ? (
                              <span className="flex items-center gap-1 text-[10px] bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                                <CheckCircle className="w-3 h-3" /> Executed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] bg-red-950/50 border border-red-900/30 text-red-400 px-2 py-0.5 rounded-full font-medium">
                                <AlertCircle className="w-3 h-3" /> Call Error
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                              Running...
                            </span>
                          )}
                        </div>

                        {/* Collapsible Tool Arguments */}
                        <div className="text-xs font-sans text-neutral-400">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                            Arguments:
                          </span>
                          <div className="bg-neutral-900 p-2 rounded-lg font-mono text-[11px] text-sky-200 border border-neutral-850 max-h-24 overflow-y-auto">
                            <pre>{JSON.stringify(tc.arguments, null, 2)}</pre>
                          </div>
                        </div>

                        {/* Inline Result */}
                        {resultMsg && (
                          <div className="text-xs font-sans">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                              Result Payload:
                            </span>
                            <div className="bg-neutral-900 p-2 rounded-lg font-mono text-[11px] text-emerald-300 border border-neutral-850 overflow-x-auto max-h-40 overflow-y-auto">
                              <pre>{resultMsg.content}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Model Pending Indicator */}
        {isWaitingForModel && (
          <div className="flex gap-3 max-w-xl mr-auto" id="chat-waiting-indicator">
            <div className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 text-emerald-400 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-neutral-950 border border-neutral-850 rounded-2xl p-3.5 rounded-tl-none shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-sans font-medium">
                <Bot className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Agent is reasoning...</span>
              </div>
              <div className="h-1.5 w-40 bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-progress" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Input Submit Bar */}
      <div className="p-3 bg-neutral-950 border-t border-neutral-800">
        {!isConnected && (
          <div className="mb-2 px-3 py-1.5 bg-yellow-950/20 border border-yellow-900/30 text-yellow-500 text-[11px] rounded-lg flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Chat agent cannot invoke tools because MCP server connection is offline. Configure it in settings first.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder={isConnected ? "Ask the AI copilot to perform MCP tasks..." : "Provide an MCP address in Settings to start..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isWaitingForModel}
            className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none transition font-sans"
            id="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isWaitingForModel}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl transition flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            id="chat-submit-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
