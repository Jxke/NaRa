export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const bridgeUrl = process.env.COMFY_BRIDGE_URL;
  const bridgeToken = process.env.COMFY_BRIDGE_TOKEN;

  if (!bridgeUrl || !bridgeToken) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Netlify bridge environment is not configured." })
    };
  }

  try {
    const body = event.body ?? "{}";
    const response = await fetch(new URL("/generate", bridgeUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${bridgeToken}`
      },
      body
    });

    return {
      statusCode: response.status,
      headers: { "content-type": "application/json" },
      body: await response.text()
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: `Bridge request failed: ${error.message}` })
    };
  }
}
