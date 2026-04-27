/**
 * compress-hourly — Supabase Edge Function
 *
 * T1 -> T2 compression. Runs at :05 past every hour via pg_cron.
 *
 * For each device with tier_1_signals in the last 2 hours:
 *   1. Fetches all T1 signals ordered by created_at ASC
 *   2. Formats them as text for LLM summarization
 *   3. Calls LLM to produce a structured daily summary
 *   4. Upserts into tier_2_daily for today's date
 *
 * Auth: Service role key OR CRON_SECRET header (internal only)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { summarize } from "../_shared/llm.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LOOKBACK_HOURS = 2;

const SYSTEM_PROMPT = `You are summarizing a person's recent activity from sensor and speech data. Produce a JSON object with:
- dominant_topics (string[]): the main topics discussed or detected
- emotional_arc (array of {hour: string, valence: string, arousal: number}): emotional trajectory over the time window
- key_moments (array of {time: string, description: string}): notable events or utterances
- motion_summary (object with string keys and number values): summary of motion states and durations
Be concise. Return ONLY valid JSON, no markdown fences.`;

function authenticateCron(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (authHeader && SERVICE_ROLE_KEY) {
    const token = authHeader.replace("Bearer ", "");
    if (token === SERVICE_ROLE_KEY) return true;
  }

  const cronSecret = req.headers.get("X-Cron-Secret");
  if (cronSecret && CRON_SECRET && cronSecret === CRON_SECRET) return true;

  return false;
}

function formatSignalsAsText(
  signals: Array<{
    created_at: string;
    transcript: string | null;
    keywords: string[] | null;
    topics: string[] | null;
    emotional_valence: string | null;
    arousal: number | null;
    stress: number | null;
    motion_state: string | null;
  }>
): string {
  return signals
    .map((s) => {
      const parts = [`[${s.created_at}]`];
      if (s.transcript) parts.push(`Speech: "${s.transcript}"`);
      if (s.keywords?.length) parts.push(`Keywords: ${s.keywords.join(", ")}`);
      if (s.topics?.length) parts.push(`Topics: ${s.topics.join(", ")}`);
      if (s.emotional_valence) parts.push(`Valence: ${s.emotional_valence}`);
      if (s.arousal != null) parts.push(`Arousal: ${s.arousal}`);
      if (s.stress != null) parts.push(`Stress: ${s.stress}`);
      if (s.motion_state) parts.push(`Motion: ${s.motion_state}`);
      return parts.join(" | ");
    })
    .join("\n");
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!authenticateCron(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const cutoff = new Date(
      Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000
    ).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    // Find distinct devices with recent T1 signals
    const { data: deviceRows, error: deviceError } = await supabase
      .from("tier_1_signals")
      .select("device_id")
      .eq("speaker_label", "user_prompt")
      .gte("created_at", cutoff);

    if (deviceError) throw deviceError;
    if (!deviceRows?.length) {
      return new Response(
        JSON.stringify({ message: "No devices with recent signals", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceIds = [...new Set(deviceRows.map((r) => r.device_id))];

    const results: Array<{
      device_id: string;
      signals_count: number;
      input_tokens: number;
      output_tokens: number;
      model: string;
    }> = [];

    for (const deviceId of deviceIds) {
      // Fetch all T1 signals for this device in the lookback window
      const { data: signals, error: sigError } = await supabase
        .from("tier_1_signals")
        .select(
          "created_at, transcript, keywords, topics, emotional_valence, arousal, stress, motion_state"
        )
        .eq("device_id", deviceId)
        .eq("speaker_label", "user_prompt")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true });

      if (sigError) throw sigError;
      if (!signals?.length) continue;

      const formattedText = formatSignalsAsText(signals);

      // Call LLM for summarization
      const llmResult = await summarize(SYSTEM_PROMPT, formattedText, {
        maxTokens: 800,
        temperature: 0.3,
      });

      // Parse the JSON response
      let parsed: {
        dominant_topics?: string[];
        emotional_arc?: unknown;
        key_moments?: unknown;
        motion_summary?: unknown;
      };
      try {
        parsed = JSON.parse(llmResult.content);
      } catch {
        // If LLM returned markdown-fenced JSON, strip fences and retry
        const cleaned = llmResult.content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      }

      // Check if a T2 row already exists for this device + date
      const { data: existing } = await supabase
        .from("tier_2_daily")
        .select("id")
        .eq("device_id", deviceId)
        .eq("date", today)
        .maybeSingle();

      const row = {
        device_id: deviceId,
        date: today,
        dominant_topics: parsed.dominant_topics ?? [],
        emotional_arc: parsed.emotional_arc ?? [],
        key_moments: parsed.key_moments ?? [],
        motion_summary: parsed.motion_summary ?? {},
      };

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("tier_2_daily")
          .update({
            dominant_topics: row.dominant_topics,
            emotional_arc: row.emotional_arc,
            key_moments: row.key_moments,
            motion_summary: row.motion_summary,
          })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("tier_2_daily")
          .insert(row);
        if (insertError) throw insertError;
      }

      results.push({
        device_id: deviceId,
        signals_count: signals.length,
        input_tokens: llmResult.inputTokens,
        output_tokens: llmResult.outputTokens,
        model: llmResult.model,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Compressed T1->T2 for ${results.length} device(s)`,
        processed: results.length,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Compression failed", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
