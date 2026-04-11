/**
 * Device API key authentication helper for Edge Functions.
 *
 * Usage in an Edge Function:
 *   const deviceId = await authenticateDevice(req);
 *   if (!deviceId) return new Response('Unauthorized', { status: 401 });
 *
 * The device sends its API key in the `X-Device-Key` header.
 * We hash it and look up the device_id from device_api_keys.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticateDevice(
  req: Request
): Promise<string | null> {
  const apiKey = req.headers.get("X-Device-Key");
  if (!apiKey) return null;

  const keyHash = await hashKey(apiKey);

  const { data, error } = await supabase
    .from("device_api_keys")
    .select("device_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  // Update last_used_at (fire-and-forget, don't block the request)
  supabase
    .from("device_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then();

  return data.device_id;
}
