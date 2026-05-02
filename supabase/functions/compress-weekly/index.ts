/**
 * compress-weekly — Supabase Edge Function
 *
 * T3 -> T4 compression. Runs Sunday midnight via pg_cron.
 *
 * For each device with a tier_3_weekly row from this week:
 *   1. Fetches this week's T3 row AND existing T4 themes
 *   2. Calls LLM to maintain long-term identity themes
 *   3. Reinforces existing themes (updates strength + last_reinforced_at)
 *   4. Inserts new themes when novel patterns emerge
 *   5. Caps total themes at 20 per device
 *
 * Auth: Service role key OR CRON_SECRET header (internal only)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { summarize } from "../_shared/llm.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MAX_THEMES = 20;

const SYSTEM_PROMPT = `You are maintaining a person's long-term identity themes from weekly patterns. Given existing themes and this week's patterns, produce a JSON array of theme objects:
[{
  "theme_type": "emotional" | "relational" | "decision",
  "theme_name": string,
  "description": string,
  "strength": number (0-1)
}]

Rules:
- Reinforce existing themes that appear in the weekly data (increase strength toward 1.0)
- Slightly decrease strength for existing themes NOT reflected this week
- Add new themes if novel patterns emerge
- Do not exceed ${MAX_THEMES} total themes
- Remove or merge the weakest themes if the limit would be exceeded
- Return ONLY a valid JSON array, no markdown fences.`;

interface ThemeFromLLM {
  theme_type: string;
  theme_name: string;
  description: string;
  strength: number;
}

interface ExistingTheme {
  id: number;
  theme_type: string;
  theme_name: string;
  description: string | null;
  strength: number;
  last_reinforced_at: string;
}

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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatContextForLLM(
  t3Row: {
    recurring_topics: string[] | null;
    emotional_patterns: unknown;
    decision_trends: unknown;
  },
  existingThemes: ExistingTheme[]
): string {
  const sections: string[] = [];

  // Existing themes
  if (existingThemes.length > 0) {
    sections.push("=== EXISTING IDENTITY THEMES ===");
    for (const theme of existingThemes) {
      sections.push(
        `- [${theme.theme_type}] "${theme.theme_name}" (strength: ${theme.strength.toFixed(2)}): ${theme.description ?? "no description"}`
      );
    }
  } else {
    sections.push("=== EXISTING IDENTITY THEMES ===");
    sections.push("(none yet — this is the first week)");
  }

  sections.push("");
  sections.push("=== THIS WEEK'S PATTERNS ===");

  if (t3Row.recurring_topics?.length) {
    sections.push(
      `Recurring Topics: ${t3Row.recurring_topics.join(", ")}`
    );
  }
  if (t3Row.emotional_patterns) {
    sections.push(
      `Emotional Patterns: ${JSON.stringify(t3Row.emotional_patterns)}`
    );
  }
  if (t3Row.decision_trends) {
    sections.push(
      `Decision Trends: ${JSON.stringify(t3Row.decision_trends)}`
    );
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
    const weekStart = getWeekStart(new Date());
    const now = new Date().toISOString();

    // Find all T3 rows for this week
    const { data: t3Rows, error: t3Error } = await supabase
      .from("tier_3_weekly")
      .select(
        "device_id, recurring_topics, emotional_patterns, decision_trends"
      )
      .eq("week_start", weekStart);

    if (t3Error) throw t3Error;
    if (!t3Rows?.length) {
      return new Response(
        JSON.stringify({
          message: "No T3 weekly records for this week",
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
      themes_updated: number;
      themes_created: number;
      input_tokens: number;
      output_tokens: number;
      model: string;
    }> = [];

    for (const t3Row of t3Rows) {
      // Fetch existing T4 themes for this device
      const { data: existingThemes, error: themeError } = await supabase
        .from("tier_4_themes")
        .select("id, theme_type, theme_name, description, strength, last_reinforced_at")
        .eq("device_id", t3Row.device_id)
        .order("strength", { ascending: false });

      if (themeError) throw themeError;

      const themes: ExistingTheme[] = existingThemes ?? [];
      const contextText = formatContextForLLM(t3Row, themes);

      const llmResult = await summarize(SYSTEM_PROMPT, contextText, {
        maxTokens: 800,
        temperature: 0.3,
      });

      let parsedThemes: ThemeFromLLM[];
      try {
        parsedThemes = JSON.parse(llmResult.content);
      } catch {
        const cleaned = llmResult.content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsedThemes = JSON.parse(cleaned);
      }

      // Enforce max themes
      const cappedThemes = parsedThemes.slice(0, MAX_THEMES);

      // Build a lookup of existing themes by name for matching
      const existingByName = new Map<string, ExistingTheme>();
      for (const t of themes) {
        existingByName.set(t.theme_name.toLowerCase(), t);
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const theme of cappedThemes) {
        const clampedStrength = Math.max(0, Math.min(1, theme.strength));
        const matchKey = theme.theme_name.toLowerCase();
        const existing = existingByName.get(matchKey);

        if (existing) {
          // Reinforce existing theme
          const { error: updateError } = await supabase
            .from("tier_4_themes")
            .update({
              strength: clampedStrength,
              description: theme.description,
              last_reinforced_at: now,
            })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          updatedCount++;
          // Remove from map so we know which weren't reinforced
          existingByName.delete(matchKey);
        } else {
          // Insert new theme
          const { error: insertError } = await supabase
            .from("tier_4_themes")
            .insert({
              device_id: t3Row.device_id,
              theme_type: theme.theme_type,
              theme_name: theme.theme_name,
              description: theme.description,
              strength: clampedStrength,
              last_reinforced_at: now,
            });
          if (insertError) throw insertError;
          createdCount++;
        }
      }

      results.push({
        device_id: t3Row.device_id,
        themes_updated: updatedCount,
        themes_created: createdCount,
        input_tokens: llmResult.inputTokens,
        output_tokens: llmResult.outputTokens,
        model: llmResult.model,
      });
    }

    return new Response(
      JSON.stringify({
        message: `Compressed T3->T4 for ${results.length} device(s)`,
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
