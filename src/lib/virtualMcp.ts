// Client-side Virtual MT Manager MCP Server
// Enables full offline and static-hosting (Netlify/Vercel/GitHub Pages) compatibility

export const virtualFileSystem: Record<string, string> = {
  "/sdcard/Documents/project_notes.txt":
    "# MT Manager 2026 Android Workspace\nActive project: App reverse engineering and DEX patch.\nTarget APK: com.example.androidapp\nStatus: Initialized.",
  "/sdcard/Download/AndroidManifest.xml": `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.momo.mt.sample" android:versionCode="202608" android:versionName="2026.8.0">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <application android:allowBackup="true" android:label="SampleApp">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
  "/sdcard/Android/data/com.momo.mt/config.json": JSON.stringify(
    {
      version: "2026.8.0",
      theme: "dark_emerald",
      mcp_port: 2319,
      mcp_enabled: true,
      root_mode: false,
      smali_compiler: "baksmali_v3.2",
    },
    null,
    2
  ),
  "/sdcard/Documents/build.gradle": `plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    namespace 'com.example.myapp'
    compileSdk 36

    defaultConfig {
        applicationId "com.example.myapp"
        minSdk 26
        targetSdk 36
        versionCode 1
        versionName "1.0.0"
    }
}`,
};

export function handleVirtualRpc(payload: any) {
  const { id, method, params } = payload || {};

  if (method === "initialize") {
    return {
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
          name: "MT Manager 2026 Virtual Sandbox",
          version: "2026.8.1-client",
        },
      },
    };
  }

  if (method === "tools/list") {
    return {
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
    };
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (toolName === "list_directory") {
      const queryPath = toolArgs.path || "/sdcard";
      const matchingFiles = Object.keys(virtualFileSystem).filter((k) => k.startsWith(queryPath));
      const files = matchingFiles.map((f) => ({
        path: f,
        name: f.split("/").pop(),
        size: `${virtualFileSystem[f].length} bytes`,
        type: "file",
      }));

      return {
        jsonrpc: "2.0",
        id,
        result: {
          path: queryPath,
          total: files.length,
          entries:
            files.length > 0
              ? files
              : [
                  { name: "Documents", type: "directory", path: `${queryPath}/Documents` },
                  { name: "Download", type: "directory", path: `${queryPath}/Download` },
                  { name: "Android", type: "directory", path: `${queryPath}/Android` },
                ],
        },
      };
    }

    if (toolName === "read_file") {
      const filePath = toolArgs.path;
      if (virtualFileSystem[filePath]) {
        return {
          jsonrpc: "2.0",
          id,
          result: { path: filePath, content: virtualFileSystem[filePath] },
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          error: `File not found at path '${filePath}'`,
          available_sample_files: Object.keys(virtualFileSystem),
        },
      };
    }

    if (toolName === "write_file") {
      const { path: filePath, content } = toolArgs;
      if (!filePath) {
        return { jsonrpc: "2.0", id, result: { error: "Missing path parameter" } };
      }
      virtualFileSystem[filePath] = content || "";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          success: true,
          path: filePath,
          bytesWritten: (content || "").length,
          message: `Successfully wrote file to ${filePath}`,
        },
      };
    }

    if (toolName === "apk_inspect") {
      return {
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
      };
    }

    if (toolName === "execute_shell") {
      const cmd = (toolArgs.command || "").trim();
      let output = "";

      if (cmd.includes("getprop")) {
        output =
          "[ro.build.version.release]: [16]\n[ro.product.model]: [Android Smartphone]\n[ro.product.manufacturer]: [MT Manager Virtual Device]\n[ro.build.display.id]: [AP2A.260814.001]";
      } else if (cmd.includes("pm list packages")) {
        output = "package:com.momo.mt\npackage:com.android.chrome\npackage:com.android.settings\npackage:com.termux\npackage:com.google.android.gms";
      } else if (cmd.includes("df")) {
        output =
          "Filesystem      1K-blocks      Used Available Use% Mounted on\n/dev/root        30412800  18247680  12165120  60% /\n/data           120000000  45000000  75000000  38% /data\n/sdcard         120000000  45000000  75000000  38% /sdcard";
      } else {
        output = `Executed: ${cmd}\nExit code: 0\nOutput: Command completed successfully.`;
      }

      return {
        jsonrpc: "2.0",
        id,
        result: { command: cmd, output, exitCode: 0 },
      };
    }

    if (toolName === "system_info") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          device: "Android Smartphone",
          androidVersion: "Android 16 (API 36)",
          mtManagerVersion: "MT Manager 2026.8.0 VIP",
          mcpProtocolVersion: "2024-11-05",
          architecture: "arm64-v8a",
          battery: "92% (Discharging)",
          internalStorage: "75 GB Free / 128 GB Total",
          ram: "8 GB LPDDR5 (3.4 GB Available)",
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      result: { error: `Unknown tool: '${toolName}'` },
    };
  }

  if (method === "resources/list") {
    return {
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
    };
  }

  if (method === "resources/read") {
    const uri = params?.uri;
    if (uri === "android://sdcard/AndroidManifest.xml") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [{ uri, mimeType: "text/xml", text: virtualFileSystem["/sdcard/Download/AndroidManifest.xml"] }],
        },
      };
    }
    if (uri === "android://sdcard/build.gradle") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [{ uri, mimeType: "text/plain", text: virtualFileSystem["/sdcard/Documents/build.gradle"] }],
        },
      };
    }
    if (uri === "android://mt/config.json") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [{ uri, mimeType: "application/json", text: virtualFileSystem["/sdcard/Android/data/com.momo.mt/config.json"] }],
        },
      };
    }
    return { jsonrpc: "2.0", id, result: { error: `Resource '${uri}' not found` } };
  }

  if (method === "prompts/list") {
    return {
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
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method '${method}' not found` },
  };
}
