/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const HOST = "0.0.0.0";

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  // --- API Routes ---

  // MCP proxy endpoint
  app.post("/api/mcp/proxy", async (req, res) => {
    const { url, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing destination URL" });
    }

    try {
      const mergedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: mergedHeaders,
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      res.status(response.status).json({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
      });
    } catch (error: any) {
      console.error("Proxy error calling", url, error);
      res.status(500).json({
        error: "Failed to connect to MCP server",
        message: error.message || String(error),
      });
    }
  });

  // Gemini Chat agent endpoint with dynamic MCP function schemas
  app.post("/api/chat", async (req, res) => {
    const { messages, mcpTools, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing or invalid messages history" });
    }

    try {
      // Map MCP tools to Gemini function declarations
      const functionDeclarations = (mcpTools || []).map((tool: any) => {
        // Map parameter properties to Gemini Types (defaulting to Type.STRING if unspecified)
        const mappedProperties: Record<string, any> = {};
        const originalProperties = tool.inputSchema?.properties || {};

        for (const [key, value] of Object.entries(originalProperties)) {
          const propVal = value as any;
          let geminiType = Type.STRING;

          if (propVal.type === "string") geminiType = Type.STRING;
          else if (propVal.type === "number") geminiType = Type.NUMBER;
          else if (propVal.type === "integer") geminiType = Type.INTEGER;
          else if (propVal.type === "boolean") geminiType = Type.BOOLEAN;
          else if (propVal.type === "array") geminiType = Type.ARRAY;
          else if (propVal.type === "object") geminiType = Type.OBJECT;

          mappedProperties[key] = {
            type: geminiType,
            description: propVal.description || "",
            ...(geminiType === Type.ARRAY && propVal.items ? { items: propVal.items } : {}),
            ...(geminiType === Type.OBJECT && propVal.properties ? { properties: propVal.properties } : {}),
          };
        }

        return {
          name: tool.name,
          description: tool.description || `Call the ${tool.name} tool on the MCP server.`,
          parameters: {
            type: Type.OBJECT,
            properties: mappedProperties,
            required: tool.inputSchema?.required || [],
          },
        };
      });

      // Map chat messages to Gemini's native content schema
      const formattedContents = messages.map((msg: any) => {
        const parts: any[] = [];

        if (msg.role === "tool") {
          // If the role is tool, it's a response to a previous function call
          parts.push({
            functionResponse: {
              name: msg.name,
              response: msg.result,
            },
          });
          return {
            role: "tool",
            parts,
          };
        }

        // Add text content if present
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        // Add function calls if the model generated them in a previous turn
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          msg.toolCalls.forEach((tc: any) => {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments,
              },
            });
          });
        }

        return {
          role: msg.role === "model" ? "model" : "user",
          parts,
        };
      });

      const config: any = {
        systemInstruction: systemInstruction || "You are a professional AI assistant integrated with an MCP client. You have access to local/remote tools via MCP. Help the user complete tasks using these tools. Always explain what you are doing before calling tools.",
      };

      // Only attach tools config if there are tools available
      if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config,
      });

      // Prepare response payload
      const text = response.text || "";
      const functionCalls = response.functionCalls || [];

      res.json({
        text,
        functionCalls: functionCalls.map((fc) => ({
          name: fc.name,
          arguments: fc.args,
          id: (fc as any).id || `call_${Math.random().toString(36).substr(2, 9)}`,
        })),
      });
    } catch (error: any) {
      console.error("Gemini chat error:", error);
      res.status(500).json({
        error: "Gemini execution failed",
        message: error.message || String(error),
      });
    }
  });

  // --- Vite & Production Static File Serving ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
