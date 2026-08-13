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

  // Built-in Android & MT Manager Virtual MCP Server (JSON-RPC 2.0)
  const virtualFileSystem: Record<string, string> = {
    "/sdcard/Documents/project_notes.txt": "# MT Manager 2026 Android Workspace\nActive project: App reverse engineering and DEX patch.\nTarget APK: com.example.androidapp\nStatus: Initialized.",
    "/sdcard/Download/AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.momo.mt.sample" android:versionCode="202608" android:versionName="2026.8.0">\n    <uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n    <application android:allowBackup="true" android:label="SampleApp">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>`,
    "/sdcard/Android/data/com.momo.mt/config.json": JSON.stringify({
      version: "2026.8.0",
      theme: "dark_emerald",
      mcp_port: 2319,
      mcp_enabled: true,
      root_mode: false,
      smali_compiler: "baksmali_v3.2",
    }, null, 2),
    "/sdcard/Documents/build.gradle": `plugins {\n    id 'com.android.application'\n    id 'kotlin-android'\n}\n\nandroid {\n    namespace 'com.example.myapp'\n    compileSdk 36\n\n    defaultConfig {\n        applicationId "com.example.myapp"\n        minSdk 26\n        targetSdk 36\n        versionCode 1\n        versionName "1.0.0"\n    }\n}`,
  };

  app.post("/api/mcp/builtin", (req, res) => {
    const { jsonrpc, id, method, params } = req.body || {};

    if (jsonrpc !== "2.0") {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" },
      });
    }

    // 1. initialize
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false, subscribe: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "MT Manager 2026 Virtual MCP Server",
            version: "2026.8.1-android",
          },
        },
      });
    }

    // 2. tools/list
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "list_directory",
              description: "Lists files and subdirectories within a given Android directory path (e.g. /sdcard, /sdcard/Download).",
              inputSchema: {
                type: "object",
                properties: {
                  path: { type: "string", description: "Android absolute path to list, e.g. '/sdcard' or '/sdcard/Download'" },
                },
                required: ["path"],
              },
            },
            {
              name: "read_file",
              description: "Reads the text contents of a file from the Android file system (e.g. /sdcard/Download/AndroidManifest.xml).",
              inputSchema: {
                type: "object",
                properties: {
                  path: { type: "string", description: "Full absolute file path to read" },
                },
                required: ["path"],
              },
            },
            {
              name: "write_file",
              description: "Writes or creates a text file at a specified path in the Android file system.",
              inputSchema: {
                type: "object",
                properties: {
                  path: { type: "string", description: "Target absolute path to write" },
                  content: { type: "string", description: "File content string" },
                },
                required: ["path", "content"],
              },
            },
            {
              name: "apk_inspect",
              description: "Inspects an Android APK package or DEX structure, returning package name, version, permissions, and components.",
              inputSchema: {
                type: "object",
                properties: {
                  apk_path: { type: "string", description: "Path to the .apk file on device" },
                },
                required: ["apk_path"],
              },
            },
            {
              name: "execute_shell",
              description: "Executes an Android terminal shell command (e.g., 'getprop ro.build.version.release', 'pm list packages', 'df -h').",
              inputSchema: {
                type: "object",
                properties: {
                  command: { type: "string", description: "Shell command string to execute" },
                },
                required: ["command"],
              },
            },
            {
              name: "system_info",
              description: "Returns Android device hardware info, OS version, MT Manager version, storage stats, and battery status.",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
          ],
        },
      });
    }

    // 3. tools/call
    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (toolName === "list_directory") {
        const queryPath = toolArgs.path || "/sdcard";
        const matchingFiles = Object.keys(virtualFileSystem).filter((k) =>
          k.startsWith(queryPath)
        );
        const files = matchingFiles.map((f) => ({
          path: f,
          name: f.split("/").pop(),
          size: `${virtualFileSystem[f].length} bytes`,
          type: "file",
        }));

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            path: queryPath,
            total: files.length,
            entries: files.length > 0 ? files : [
              { name: "Documents", type: "directory", path: `${queryPath}/Documents` },
              { name: "Download", type: "directory", path: `${queryPath}/Download` },
              { name: "Android", type: "directory", path: `${queryPath}/Android` },
            ],
          },
        });
      }

      if (toolName === "read_file") {
        const filePath = toolArgs.path;
        if (virtualFileSystem[filePath]) {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              path: filePath,
              content: virtualFileSystem[filePath],
            },
          });
        }
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            error: `File not found at path '${filePath}'`,
            available_sample_files: Object.keys(virtualFileSystem),
          },
        });
      }

      if (toolName === "write_file") {
        const { path: filePath, content } = toolArgs;
        if (!filePath) {
          return res.json({ jsonrpc: "2.0", id, result: { error: "Missing path parameter" } });
        }
        virtualFileSystem[filePath] = content || "";
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            success: true,
            path: filePath,
            bytesWritten: (content || "").length,
            message: `Successfully wrote file to ${filePath}`,
          },
        });
      }

      if (toolName === "apk_inspect") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            packageName: "com.momo.mt.sample",
            versionName: "2026.8.0",
            versionCode: 202608,
            minSdk: 26,
            targetSdk: 36,
            permissions: [
              "android.permission.INTERNET",
              "android.permission.READ_EXTERNAL_STORAGE",
              "android.permission.WRITE_EXTERNAL_STORAGE",
            ],
            activities: ["com.momo.mt.sample.MainActivity"],
            dexCount: 1,
            signatures: ["SHA256: 4a:8b:9c:1d:2e:3f:4a:5b:6c:7d:8e:9f:0a:1b:2c:3d"],
            status: "DEX Verified & Parsed by MT Manager Engine",
          },
        });
      }

      if (toolName === "execute_shell") {
        const cmd = (toolArgs.command || "").trim();
        let output = "";

        if (cmd.includes("getprop")) {
          output = "[ro.build.version.release]: [16]\n[ro.product.model]: [Android Phone]\n[ro.product.manufacturer]: [Google/Generic]\n[ro.build.display.id]: [AP2A.260805.001]";
        } else if (cmd.includes("pm list packages")) {
          output = "package:com.momo.mt\npackage:com.android.chrome\npackage:com.android.settings\npackage:com.termux\npackage:com.google.android.gms";
        } else if (cmd.includes("df")) {
          output = "Filesystem      1K-blocks      Used Available Use% Mounted on\n/dev/root        30412800  18247680  12165120  60% /\n/data           120000000  45000000  75000000  38% /data\n/sdcard         120000000  45000000  75000000  38% /sdcard";
        } else {
          output = `Executed: ${cmd}\nExit code: 0\nOutput: Command completed successfully.`;
        }

        return res.json({
          jsonrpc: "2.0",
          id,
          result: { command: cmd, output, exitCode: 0 },
        });
      }

      if (toolName === "system_info") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            device: "Android Smartphone",
            androidVersion: "Android 16 (API 36)",
            mtManagerVersion: "MT Manager 2026.8.0 VIP",
            mcpProtocolVersion: "2024-11-05",
            architecture: "arm64-v8a",
            battery: "88% (Discharging)",
            internalStorage: "75 GB Free / 128 GB Total",
            ram: "8 GB LPDDR5 (3.4 GB Available)",
          },
        });
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: { error: `Unknown tool: '${toolName}'` },
      });
    }

    // 4. resources/list
    if (method === "resources/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            {
              uri: "android://sdcard/AndroidManifest.xml",
              name: "Sample Android Manifest",
              description: "App package metadata and permission declarations",
              mimeType: "text/xml",
            },
            {
              uri: "android://sdcard/build.gradle",
              name: "Project Build Configuration",
              description: "Android Gradle build definition",
              mimeType: "text/plain",
            },
            {
              uri: "android://mt/config.json",
              name: "MT Manager Workspace Config",
              description: "Preferences and decompilation settings",
              mimeType: "application/json",
            },
          ],
        },
      });
    }

    // 5. resources/read
    if (method === "resources/read") {
      const uri = params?.uri;
      if (uri === "android://sdcard/AndroidManifest.xml") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "text/xml", text: virtualFileSystem["/sdcard/Download/AndroidManifest.xml"] }],
          },
        });
      }
      if (uri === "android://sdcard/build.gradle") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "text/plain", text: virtualFileSystem["/sdcard/Documents/build.gradle"] }],
          },
        });
      }
      if (uri === "android://mt/config.json") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{ uri, mimeType: "application/json", text: virtualFileSystem["/sdcard/Android/data/com.momo.mt/config.json"] }],
          },
        });
      }
      return res.json({
        jsonrpc: "2.0",
        id,
        result: { error: `Resource '${uri}' not found` },
      });
    }

    // 6. prompts/list
    if (method === "prompts/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          prompts: [
            {
              name: "apk_decompilation_assistant",
              description: "Decompiles and analyzes an Android APK's manifest, smali code, and permissions.",
              arguments: [{ name: "target_apk", description: "Path to APK", required: true }],
            },
            {
              name: "mt_batch_script_generator",
              description: "Generates an MT Manager automation batch script for file patching.",
              arguments: [{ name: "task_description", description: "What to automate", required: true }],
            },
          ],
        },
      });
    }

    // 7. prompts/get
    if (method === "prompts/get") {
      const promptName = params?.name;
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          description: `Prompt template for ${promptName}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `You are MT Manager's AI assistant. Please perform analysis using MCP tools on ${params?.arguments?.target_apk || "the project"}.`,
              },
            },
          ],
        },
      });
    }

    return res.status(404).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  });

  // MCP proxy endpoint
  app.post("/api/mcp/proxy", async (req, res) => {
    const { url, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing destination URL" });
    }

    // If the request points to our internal virtual server
    if (url === "/api/mcp/builtin" || url.endsWith("/api/mcp/builtin")) {
      const internalRes = await fetch(`http://127.0.0.1:${PORT}/api/mcp/builtin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await internalRes.json();
      return res.status(internalRes.status).json({
        status: internalRes.status,
        headers: {},
        data,
      });
    }

    try {
      const mergedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: "POST",
        headers: mergedHeaders,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      console.error("Proxy error calling", url, error?.message || error);

      // Check if user was calling 127.0.0.1 or localhost through the cloud server
      const isLocalhost = url.includes("127.0.0.1") || url.includes("localhost") || url.includes("0.0.0.0");
      let friendlyMessage = error.message || String(error);

      if (isLocalhost && (error.code === "ECONNREFUSED" || friendlyMessage.includes("ECONNREFUSED") || friendlyMessage.includes("fetch failed"))) {
        friendlyMessage = `Cloud Proxy cannot reach '${url}' because 127.0.0.1 points to the cloud container, not your Android device. To connect to MT Manager on your phone:\n1. Switch Transport Mode to 'Direct Browser' in Settings, OR\n2. Use an HTTPS tunnel (e.g. ngrok / localtunnel), OR\n3. Select the 'Built-in MT Manager Sandbox' for instant simulation.`;
      }

      res.status(502).json({
        error: "Failed to connect to MCP server",
        message: friendlyMessage,
        isLocalhostRefusal: isLocalhost,
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
        model: "gemini-3.5-flash",
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
