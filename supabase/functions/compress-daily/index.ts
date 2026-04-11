/**
 * compress-daily — Supabase Edge Function
 *
 * T2 -> T3 compression. Runs daily at midnight via pg_cron.
 *
 * For each device with a tier_2_daily row from today:
 *   1. Fetches today's T2 summary
 *   2. Formats all JSONB fields as text for LLM
 *   3. Calls LLM to identify weekly patterns
 *   4. Upserts into tier_3_weekly for the current week
 *
 * Auth: Service role key OR CRON_SECRET header (internal only)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { summarize } from "../_shared/llm.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SYSTEM_PROMPT = `You are identifying weekly patterns from daily activity summaries. Produce a JSON object with:
- recurring_topics (string[]): topics that appear repeatedly across days
- emotional_patterns (object): trends in emotional valence and arousal over the period, e.g. {trend: string, peak_times: string[], baseline: string}
- decision_trends (object): patterns in decisions or choices observed, e.g. {frequent_decisions: string[], avoidance_patterns: string[]}
- environment_mood_correlations (object): how environments relate to emotional states, e.g. {home: string, work: string, transit: string}
Focus on patterns, not individual events. Return ONLY valid JSON, no markdown fences.`;

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

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Monday as week start
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatT2AsText(row: {
  date: string;
  dominant_topics: string[] | null;
  emotional_arc: unknown;
  key_moments: unknown;
  environment_profile: unknown;
  motion_summary: unknown;
}): string {
  const sections = [`Date: ${row.date}`];

  if (row.dominant_topics?.length) {
    sections.push(`Dominant Topics: ${row.dominant_topics.join(", ")}`);
  }
  if (row.emotional_arc) {
    sections.push(`Emotional Arc: ${JSON.stringify(row.emotional_arc)}`);
  }
  if (row.key_moments) {
    sections.push(`Key Moments: ${JSON.stringify(row.key_moments)}`);
  }
  if (row.environment_profile) {
    sections.push(
      `Environment Profile: ${JSON.stringify(row.environment_profile)}`
    );
  }
  if (row.motion_summary) {
    sections.push(`Motion Summary: ${JSON.stringify(row.motion_summary)}`);
  }

  return sections.join("\n");
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
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = getWeekStart(new Date());

    // Find all T2 rows from today
    const { data: t2Rows, error: t2Error } = await supabase
      .from("tier_2_daily")
      .select(
        "device_id, date, dominant_topics, emotional_arc, key_moments, environment_profile, motion_summary"
      )
      .eq("date", today);

    if (t2Error) throw t2Error;
    if (!t2Rows?.length) {
      return new Response(
        JSON.stringify({
          message: "No T2 daily records for today",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: Array<{
      device_id: string;
      input_tokens: number;
      output_tokens: number;
      model: string;
    }> = [];

    for (const t2Row of t2Rows) {
      const formattedText = formatT2AsText(t2Row);

      const llmResult = await summarize(SYSTEM_PROMPT, formattedText, {
        maxTokens: 600,
        temperature: 0.3,
      });

      let parsed: {
        recurring_topics?: string[];
        emotional_patterns?: unknown;
        decision_trends?: unknown;
        environment_mood_correlations?: unknown;
      };
      try {
        parsed = JSON.parse(llmResult.content);
      } catch {
        const cleaned = llmResult.content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      }

      // Check if a T3 row already exists for this device + week
      const { data: existing } = await supabase
        .from("tier_3_weekly")
        .select("id")
        .eq("device_id", t2Row.device_id)
        .eq("week_start", weekStart)
        .maybeSingle();

      const row = {
        device_id: t2Row.device_id,
        week_start: weekStart,
        recurring_topics: parsed.recurring_topics ?? [],
        emotional_patterns: parsed.emotional_patterns ?? {},
        decision_trends: parsed.decision_trends ?? {},
        environment_mood_correlations:
          parsed.environment_mood_correlations ?? {},
      };

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("tier_3_weekly")
          .update({
            recurring_topics: row.recurring_topics,
            emotional_patterns: row.emotional_patterns,
            decision_trends: row.decision_trends,
            environment_mood_correlations: row.environment_mood_correlations,
          })
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("tier_3_weekly")
          .insert(row);
        if (insertError) throw insertError;
      }

      results.push({
        device_id: t2Row.device_id,
        input_tokens: llmResult.inputTokens,
        output_tokens: llmResult.outputTokens,
        model: llmResult.model,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Compressed T2->T3 for ${results.length} device(s)`,
        processed: results.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Compression failed", message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
