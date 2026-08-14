/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Model Context Protocol (MCP) Types ---

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

// --- JSON-RPC 2.0 Standard Interfaces ---

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// --- Console Log and History Types ---

export type LogType = "request" | "response" | "error" | "system";
export type LogDirection = "outgoing" | "incoming" | "none";

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  direction: LogDirection;
  method: string;
  payload: any;
  latencyMs?: number;
}

export interface RequestHistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: "success" | "error" | "pending";
  latencyMs?: number;
  summary: string;
  details: {
    request: any;
    response: any;
  };
}

// --- AI Chat Interfaces ---

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system" | "tool";
  content: string;
  timestamp: string;
  name?: string;
  result?: any;
  rawParts?: any[];
  // Optional metadata to display when a tool is called by the agent
  toolCalls?: {
    id: string;
    name: string;
    arguments: Record<string, any>;
    thoughtSignature?: string;
    thought?: boolean;
  }[];
  toolResults?: {
    id: string;
    name: string;
    result: any;
    error?: string;
  }[];
}

export interface ConnectionConfig {
  url: string;
  mode: "direct" | "proxy";
  apiKey: string;
  isCustomHeader: boolean;
  customHeaderName: string;
  geminiApiKey?: string;
}
