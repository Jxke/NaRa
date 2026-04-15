export async function handler() {
  const bridgeUrl = process.env.COMFY_BRIDGE_URL;

  if (!bridgeUrl) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "COMFY_BRIDGE_URL is not configured." })
    };
  }

  try {
    const response = await fetch(new URL("/health", bridgeUrl));

    return {
      statusCode: response.status,
      headers: { "content-type": "application/json" },
      body: await response.text()
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: `Bridge health request failed: ${error.message}` })
    };
  }
}
