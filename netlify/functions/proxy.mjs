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
    const body = await req.json();
    const { url, headers: customHeaders, body: rpcBody } = body || {};

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing destination URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mergedHeaders = {
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let targetUrl = url;
    let response = await fetch(targetUrl, {
      method: "POST",
      headers: mergedHeaders,
      body: JSON.stringify(rpcBody),
      signal: controller.signal,
    });

    if (response.status === 404 && !targetUrl.endsWith("/mcp")) {
      const altUrl = targetUrl.endsWith("/") ? `${targetUrl}mcp` : `${targetUrl}/mcp`;
      try {
        const altResponse = await fetch(altUrl, {
          method: "POST",
          headers: mergedHeaders,
          body: JSON.stringify(rpcBody),
          signal: controller.signal,
        });
        if (altResponse.ok) {
          response = altResponse;
        }
      } catch {
        // Keep initial response
      }
    }

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return new Response(
      JSON.stringify({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
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
    const isLocalhost = error?.message?.includes("127.0.0.1") || error?.message?.includes("localhost");
    let friendlyMessage = error.message || String(error);

    if (isLocalhost) {
      friendlyMessage = "Netlify Cloud Proxy cannot reach local '127.0.0.1'. Please use your Termux HTTPS tunnel (e.g. localhost.run or ngrok).";
    }

    return new Response(
      JSON.stringify({
        error: "Failed to connect to MCP server via Netlify proxy",
        message: friendlyMessage,
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
