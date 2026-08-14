import { GoogleGenAI } from "@google/genai";

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || req.headers.get("x-gemini-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing GEMINI_API_KEY",
          message: "Gemini API Key is not configured on this Netlify deployment. Please add 'GEMINI_API_KEY' in your Netlify Dashboard (Site configuration -> Environment variables), or enter your Gemini Key in the Settings tab.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, mcpTools, systemInstruction } = await req.json();
    const ai = new GoogleGenAI({ apiKey });

    const functionDeclarations = (mcpTools || []).map((t) => ({
      name: t.name,
      description: t.description || `Execute ${t.name}`,
      parameters: t.inputSchema || { type: "object", properties: {} },
    }));

    const formattedContents = (messages || []).map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response: typeof msg.result === "object" && msg.result !== null ? msg.result : { result: msg.result ?? msg.content ?? "ok" },
              },
            },
          ],
        };
      }

      if (msg.role === "model" && Array.isArray(msg.rawParts) && msg.rawParts.length > 0) {
        return {
          role: "model",
          parts: msg.rawParts,
        };
      }

      const parts = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        msg.toolCalls.forEach((tc) => {
          const partObj = {
            functionCall: {
              name: tc.name,
              args: tc.arguments || {},
            },
          };
          if (tc.thoughtSignature) partObj.thoughtSignature = tc.thoughtSignature;
          if (typeof tc.thought === "boolean") partObj.thought = tc.thought;
          parts.push(partObj);
        });
      }

      return {
        role: msg.role === "model" ? "model" : "user",
        parts: parts.length > 0 ? parts : [{ text: "" }],
      };
    });

    const config = {
      systemInstruction: systemInstruction || "You are an MCP assistant.",
    };

    if (functionDeclarations.length > 0) {
      config.tools = [{ functionDeclarations }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: formattedContents,
      config,
    });

    const candidate = response.candidates?.[0];
    const candidateContent = candidate?.content;
    const rawParts = candidateContent?.parts || [];
    const text = response.text || "";
    const functionCalls = response.functionCalls || [];

    return new Response(
      JSON.stringify({
        text,
        rawParts,
        functionCalls: functionCalls.map((fc, idx) => {
          const matchingPart =
            rawParts.find((p) => p.functionCall && p.functionCall.name === fc.name) || rawParts[idx];

          return {
            name: fc.name,
            arguments: fc.args || {},
            id: fc.id || `call_${Math.random().toString(36).substr(2, 9)}`,
            thoughtSignature: matchingPart?.thoughtSignature,
            thought: matchingPart?.thought,
          };
        }),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Gemini API error", message: error.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
