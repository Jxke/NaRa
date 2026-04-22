/**
 * consult — Supabase Edge Function
 *
 * Two-stage consultation pipeline: the core of the Maddi experience.
 *
 * When a user speaks a query into the device, this function:
 *   1. Receives audio (WAV) or a pre-transcribed JSON body
 *   2. Gathers context from all memory tiers (T1-T4) for the device
 *   3. Runs a Deep Reasoner to analyze the human situation
 *   4. Runs a Glyph Picker (fast model) to select 3 glyphs + 1 word
 *   5. Validates the selection against the glyph inventory
 *   6. Stores the consultation record and returns the result
 *
 * Auth: Device API key via X-Device-Key header (see _shared/auth.ts)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { supabase } from "../_shared/supabase.ts";
import { chat } from "../_shared/llm.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY")!;
const REASONER_MODEL = Deno.env.get("REASONER_MODEL") ?? "claude-sonnet-4-20250514";
const PICKER_MODEL = Deno.env.get("PICKER_MODEL") ?? "claude-haiku-4-5-20251001";

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen" +
  "?model=nova-2-general" +
  "&smart_format=true" +
  "&language=en-US";

const FALLBACK_GLYPH_POOL: readonly string[] = [
  "venture",
  "clarity",
  "bond",
  "balance",
  "introspect",
  "transformation",
  "harmony",
  "threshold",
  "opening",
  "courage",
  "healing",
  "release",
  "transition",
  "pattern",
  "dialogue",
];
const FALLBACK_WORD_POOL: readonly string[] = [
  "reflect",
  "notice",
  "breathe",
  "soften",
  "begin",
  "listen",
  "release",
  "steady",
  "open",
  "return",
  "trust",
  "pause",
  "shift",
  "root",
  "move",
];
const MAX_WORD_LENGTH = 15;
const REQUIRED_GLYPH_COUNT = 3;

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

const REASONER_SYSTEM_PROMPT =
  "You are a thoughtful analyst of human situations. " +
  "Given recent context and the user's spoken query, provide a concise but " +
  "thoughtful analysis of their situation. Think about what's really " +
  "going on beneath the surface. What tensions exist? What might they " +
  "be avoiding? What patterns are repeating? Notice the emotional state, " +
  "the core tension, and the directional pull within the situation without " +
  "forcing it into a rigid structure. Your analysis will be used " +
  "to select symbolic glyphs \u2014 do NOT mention glyphs, symbols, or the " +
  "selection process. Just analyze the human situation.";

const PICKER_SYSTEM_PROMPT =
  "You select 3 glyphs and 1 word for a wearable device. " +
  "Given an analysis, pick glyphs that feel meaningful together rather than " +
  "individually. The trio should suggest progression or shift, include some " +
  "tension or contrast, avoid redundancy, and feel like it leads somewhere " +
  "toward movement, possibility, or change. Do NOT assign fixed roles to " +
  "individual glyphs. Each glyph carries an underlying reflective prompt. " +
  "The final word must be derived from the combined meaning of the three " +
  "selected prompts, not from any single glyph alone. The word should not " +
  "be a synonym of one glyph; it should feel open-ended, directional, and " +
  "emergent from the trio as a whole. " +
  "You MUST choose only from the exact glyph IDs provided in the Available glyphs list. " +
  "Copy those IDs verbatim. Do not invent IDs. Do not rename IDs. Do not change spacing, " +
  "punctuation, plurality, or casing. If uncertain, reuse exact IDs from the list. " +
  "Pick 1 companion word (max 15 chars, lowercase). " +
  "You MUST respond with ONLY this exact JSON format, nothing else:\n" +
  '{"glyphs": ["id1", "id2", "id3"], "word": "yourword"}\n' +
  "Do NOT include any explanation, markdown, or text outside the JSON object.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlyphRow {
  id: string;
  tags: string[];
  interpretations: string[];
  prompt_questions: string[];
}

interface PickerResult {
  glyphs: string[];
  word: string;
}

interface Tier1Row {
  transcript: string | null;
  keywords: string[] | null;
  topics: string[] | null;
  emotional_valence: string | null;
  motion_state: string | null;
  created_at: string;
}

interface Tier2Row {
  dominant_topics: string[] | null;
  emotional_arc: unknown;
  key_moments: unknown;
}

interface Tier3Row {
  recurring_topics: string[] | null;
  emotional_patterns: unknown;
  decision_trends: unknown;
}

interface Tier4Row {
  theme_name: string;
  theme_type: string;
  description: string | null;
  strength: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  error: string,
  status: number,
  detail?: string,
): Response {
  const body: Record<string, unknown> = { error };
  if (detail) body.detail = detail;
  return jsonResponse(body, status);
}

// ---------------------------------------------------------------------------
// Stage 0: Speech-to-text (conditional)
// ---------------------------------------------------------------------------

async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
  const response = await fetch(DEEPGRAM_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "audio/wav",
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown Deepgram error");
    throw new Error(`Deepgram STT error ${response.status}: ${detail}`);
  }

  const result = await response.json();
  const transcript =
    result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

  return transcript;
}

// ---------------------------------------------------------------------------
// Stage 1: Fetch context from all tiers
// ---------------------------------------------------------------------------

async function fetchContext(
  deviceId: string,
): Promise<string> {
  const [t1Result, t2Result, t3Result, t4Result] = await Promise.all([
    supabase
      .from("tier_1_signals")
      .select("transcript, keywords, topics, emotional_valence, motion_state, created_at")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("tier_2_daily")
      .select("dominant_topics, emotional_arc, key_moments")
      .eq("device_id", deviceId)
      .eq("date", new Date().toISOString().slice(0, 10))
      .limit(1),

    supabase
      .from("tier_3_weekly")
      .select("recurring_topics, emotional_patterns, decision_trends")
      .eq("device_id", deviceId)
      .gte("week_start", getWeekStart())
      .limit(1),

    supabase
      .from("tier_4_themes")
      .select("theme_name, theme_type, description, strength")
      .eq("device_id", deviceId)
      .order("strength", { ascending: false })
      .limit(5),
  ]);

  const sections: string[] = [];

  // Recent signals (T1)
  const t1Rows = (t1Result.data ?? []) as Tier1Row[];
  if (t1Rows.length > 0) {
    const signalLines = t1Rows.map((s) => {
      const parts: string[] = [];
      if (s.transcript) parts.push(`"${s.transcript}"`);
      if (s.emotional_valence) parts.push(`mood: ${s.emotional_valence}`);
      if (s.motion_state) parts.push(`motion: ${s.motion_state}`);
      if (s.topics && s.topics.length > 0) parts.push(`topics: ${s.topics.join(", ")}`);
      return `- ${parts.join(" | ")}`;
    });
    sections.push(`RECENT SIGNALS (last few utterances):\n${signalLines.join("\n")}`);
  }

  // Today's summary (T2)
  const t2Rows = (t2Result.data ?? []) as Tier2Row[];
  if (t2Rows.length > 0) {
    const t2 = t2Rows[0];
    const parts: string[] = [];
    if (t2.dominant_topics && t2.dominant_topics.length > 0) {
      parts.push(`Topics today: ${t2.dominant_topics.join(", ")}`);
    }
    if (t2.emotional_arc) {
      parts.push(`Emotional arc: ${JSON.stringify(t2.emotional_arc)}`);
    }
    if (t2.key_moments) {
      parts.push(`Key moments: ${JSON.stringify(t2.key_moments)}`);
    }
    if (parts.length > 0) {
      sections.push(`TODAY'S SUMMARY:\n${parts.join("\n")}`);
    }
  }

  // This week's patterns (T3)
  const t3Rows = (t3Result.data ?? []) as Tier3Row[];
  if (t3Rows.length > 0) {
    const t3 = t3Rows[0];
    const parts: string[] = [];
    if (t3.recurring_topics && t3.recurring_topics.length > 0) {
      parts.push(`Recurring topics: ${t3.recurring_topics.join(", ")}`);
    }
    if (t3.emotional_patterns) {
      parts.push(`Emotional patterns: ${JSON.stringify(t3.emotional_patterns)}`);
    }
    if (t3.decision_trends) {
      parts.push(`Decision trends: ${JSON.stringify(t3.decision_trends)}`);
    }
    if (parts.length > 0) {
      sections.push(`THIS WEEK'S PATTERNS:\n${parts.join("\n")}`);
    }
  }

  // Long-term themes (T4)
  const t4Rows = (t4Result.data ?? []) as Tier4Row[];
  if (t4Rows.length > 0) {
    const themeLines = t4Rows.map(
      (t) => `- ${t.theme_name} (${t.theme_type}, strength: ${t.strength.toFixed(2)})${t.description ? `: ${t.description}` : ""}`,
    );
    sections.push(`LONG-TERM THEMES:\n${themeLines.join("\n")}`);
  }

  if (sections.length === 0) {
    return "No prior context available. This appears to be the first interaction.";
  }

  return sections.join("\n\n");
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday-based week
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Stage 2: Deep Reasoner
// ---------------------------------------------------------------------------

async function runDeepReasoner(
  contextBlock: string,
  transcript: string,
): Promise<string> {
  const userMessage = `${contextBlock}\n\nTheir question: ${transcript}`;

  const result = await chat(
    [
      { role: "system", content: REASONER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    {
      model: REASONER_MODEL,
      maxTokens: 800,
      temperature: 0.7,
    },
  );

  return result.content;
}

// ---------------------------------------------------------------------------
// Stage 3: Glyph Picker
// ---------------------------------------------------------------------------

function formatGlyphInventory(glyphs: GlyphRow[]): string {
  return glyphs
    .map((g) => {
      const interps = g.interpretations.slice(0, 3).join("; ");
      const prompts = g.prompt_questions.slice(0, 3).join("; ");
      return `${g.id}: tags=[${g.tags.join(", ")}] interpretations=[${interps}] prompt_questions=[${prompts}]`;
    })
    .join("\n");
}

async function runGlyphPicker(
  reasoning: string,
  glyphInventory: string,
  retryPrompt?: string,
): Promise<PickerResult> {
  const userMessage =
    `Analysis:\n${reasoning}\n\nAvailable glyphs:\n${glyphInventory}` +
    (retryPrompt ? `\n\n${retryPrompt}` : "");

  const result = await chat(
    [
      { role: "system", content: PICKER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    {
      model: PICKER_MODEL,
      maxTokens: 200,
      temperature: 0.9,
    },
  );

  return parsePickerResponse(result.content);
}

function parsePickerResponse(raw: string): PickerResult {
  console.log("[Picker] Raw response:", raw);

  // Try multiple extraction strategies
  let jsonStr = raw;

  // 1. Strip markdown fences
  jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // 2. If there's text before/after JSON, extract just the JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*"glyphs"[\s\S]*"word"[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  if (
    !parsed ||
    !Array.isArray(parsed.glyphs) ||
    typeof parsed.word !== "string"
  ) {
    throw new Error("Invalid picker response structure");
  }

  return {
    glyphs: parsed.glyphs.map((g: unknown) => String(g)),
    word: String(parsed.word).toLowerCase().trim(),
  };
}

function canonicalGlyphId(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

const LEGACY_GLYPH_ALIASES = new Map<string, string>([
  ["spiral", "venture"],
  ["mirror", "clarity"],
  ["bridge", "bond"],
]);

function normalizePickerResult(
  result: PickerResult,
  validGlyphIds: readonly string[],
): PickerResult {
  const glyphIdMap = new Map<string, string>();
  for (const id of validGlyphIds) {
    glyphIdMap.set(canonicalGlyphId(id), id);
  }

  return {
    glyphs: result.glyphs.map((id) => {
      const canonical = canonicalGlyphId(id);
      const aliased = LEGACY_GLYPH_ALIASES.get(canonical) ?? canonical;
      return glyphIdMap.get(aliased) ?? glyphIdMap.get(canonical) ?? id.trim().toLowerCase();
    }),
    word: result.word.trim().toLowerCase(),
  };
}

function repairGlyphSelection(
  glyphs: readonly string[],
  validGlyphIds: readonly string[],
): string[] {
  const glyphIdMap = new Map<string, string>();
  for (const id of validGlyphIds) {
    glyphIdMap.set(canonicalGlyphId(id), id);
  }

  const repaired: string[] = [];
  const seen = new Set<string>();

  for (const rawId of glyphs) {
    const canonical = canonicalGlyphId(rawId);
    const aliased = LEGACY_GLYPH_ALIASES.get(canonical) ?? canonical;
    const resolved = glyphIdMap.get(aliased) ?? glyphIdMap.get(canonical);
    if (!resolved || seen.has(resolved)) continue;
    repaired.push(resolved);
    seen.add(resolved);
    if (repaired.length === REQUIRED_GLYPH_COUNT) return repaired;
  }

  for (const fallback of FALLBACK_GLYPH_POOL) {
    if (seen.has(fallback)) continue;
    repaired.push(fallback);
    seen.add(fallback);
    if (repaired.length === REQUIRED_GLYPH_COUNT) break;
  }

  return repaired;
}

function fallbackGlyphSelection(): string[] {
  return FALLBACK_GLYPH_POOL.slice(0, REQUIRED_GLYPH_COUNT);
}

function fallbackWordSelection(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) >>> 0;
  }
  return FALLBACK_WORD_POOL[hash % FALLBACK_WORD_POOL.length];
}

function normalizeAndValidatePickerResult(
  result: PickerResult,
  validGlyphIds: readonly string[],
): { pickerResult: PickerResult; validationError: string | null } {
  const pickerResult = normalizePickerResult(result, validGlyphIds);
  return {
    pickerResult,
    validationError: validatePickerResult(pickerResult, new Set(validGlyphIds)),
  };
}

// ---------------------------------------------------------------------------
// Stage 4: Constraint Validation
// ---------------------------------------------------------------------------

function validatePickerResult(
  result: PickerResult,
  validGlyphIds: ReadonlySet<string>,
): string | null {
  const { glyphs, word } = result;

  if (glyphs.length !== REQUIRED_GLYPH_COUNT) {
    return `Expected exactly ${REQUIRED_GLYPH_COUNT} glyphs, got ${glyphs.length}`;
  }

  const uniqueIds = new Set(glyphs);
  if (uniqueIds.size !== REQUIRED_GLYPH_COUNT) {
    return "Duplicate glyph IDs detected";
  }

  for (const id of glyphs) {
    if (!validGlyphIds.has(id)) {
      return `Invalid glyph ID: "${id}"`;
    }
  }

  if (word.length > MAX_WORD_LENGTH) {
    return `Word "${word}" exceeds ${MAX_WORD_LENGTH} characters`;
  }

  return null; // valid
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const startTime = performance.now();

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Authenticate device
  const deviceId = await authenticateDevice(req);
  if (!deviceId) {
    return errorResponse("Unauthorized", 401);
  }

  // -----------------------------------------------------------------------
  // Determine input: audio or JSON transcript
  // -----------------------------------------------------------------------
  let transcript: string;
  const contentType = req.headers.get("Content-Type") ?? "";

  if (contentType.startsWith("audio/")) {
    // Option A: Audio input — run STT first
    const audioBuffer = await req.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return errorResponse("No audio body provided", 400);
    }

    try {
      transcript = await transcribeAudio(audioBuffer);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "STT failed";
      return errorResponse("Deepgram STT failed", 502, detail);
    }

    if (!transcript || transcript.trim().length === 0) {
      return errorResponse("No speech detected in audio", 400);
    }
  } else {
    // Option B: JSON body with transcript
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    if (typeof body.transcript !== "string" || body.transcript.trim().length === 0) {
      return errorResponse("Missing or empty transcript field", 400);
    }

    transcript = body.transcript.trim();
  }

  // -----------------------------------------------------------------------
  // Stage 1: Fetch context + glyph inventory in parallel
  // -----------------------------------------------------------------------
  let contextBlock: string;
  let glyphRows: GlyphRow[];

  try {
    const [context, glyphResult] = await Promise.all([
      fetchContext(deviceId),
      supabase
        .from("glyphs")
        .select("id, tags, interpretations, prompt_questions"),
    ]);

    contextBlock = context;

    if (glyphResult.error) {
      throw new Error(`Failed to fetch glyphs: ${glyphResult.error.message}`);
    }

    glyphRows = (glyphResult.data ?? []) as GlyphRow[];
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Context fetch failed";
    return errorResponse("Failed to load context", 502, detail);
  }

  const validGlyphIdList = glyphRows.map((g) => g.id);
  const validGlyphIds = new Set(validGlyphIdList);
  const glyphInventoryText = formatGlyphInventory(glyphRows);

  // -----------------------------------------------------------------------
  // Stage 2: Deep Reasoner
  // -----------------------------------------------------------------------
  let reasoning: string;

  try {
    reasoning = await runDeepReasoner(contextBlock, transcript);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Reasoner failed";
    return errorResponse("Deep Reasoner failed", 502, detail);
  }

  // -----------------------------------------------------------------------
  // Stage 3 + 4: Glyph Picker with validation and retry
  // -----------------------------------------------------------------------
  let selectedGlyphs: string[];
  let selectedWord: string;

  try {
    // First attempt
    let { pickerResult, validationError } = normalizeAndValidatePickerResult(
      await runGlyphPicker(reasoning, glyphInventoryText),
      validGlyphIdList,
    );

    if (validationError !== null) {
      // Retry once with stricter prompt
      const retryHint =
        "IMPORTANT: You must select exactly 3 different valid glyph IDs " +
        "from the list. Your previous response was invalid.";

      try {
        ({ pickerResult, validationError } = normalizeAndValidatePickerResult(
          await runGlyphPicker(reasoning, glyphInventoryText, retryHint),
          validGlyphIdList,
        ));
      } catch {
        validationError = "Retry also failed to parse";
      }
    }

    if (validationError !== null) {
      // Fallback: use safe defaults
      selectedGlyphs = fallbackGlyphSelection();
      selectedWord = fallbackWordSelection(transcript);
    } else {
      selectedGlyphs = repairGlyphSelection(pickerResult.glyphs, validGlyphIdList);
      selectedWord = pickerResult.word;
    }
  } catch {
    // First attempt threw (e.g. JSON parse error) — try retry
    const retryHint =
      "IMPORTANT: You must select exactly 3 different valid glyph IDs " +
      "from the list. Your previous response was invalid.";

    try {
      const { pickerResult: retryResult, validationError: retryError } = normalizeAndValidatePickerResult(
        await runGlyphPicker(reasoning, glyphInventoryText, retryHint),
        validGlyphIdList,
      );

      if (retryError !== null) {
        selectedGlyphs = fallbackGlyphSelection();
        selectedWord = fallbackWordSelection(transcript);
      } else {
        selectedGlyphs = repairGlyphSelection(retryResult.glyphs, validGlyphIdList);
        selectedWord = retryResult.word;
      }
    } catch {
      selectedGlyphs = fallbackGlyphSelection();
      selectedWord = fallbackWordSelection(transcript);
    }
  }

  // -----------------------------------------------------------------------
  // Stage 5: Save consultation and return
  // -----------------------------------------------------------------------
  const latencyMs = Math.round(performance.now() - startTime);

  const { data: consultation, error: insertError } = await supabase
    .from("consultations")
    .insert({
      device_id: deviceId,
      query_transcript: transcript,
      glyph_ids: selectedGlyphs,
      word: selectedWord,
      reasoning,
      latency_ms: latencyMs,
    })
    .select("id")
    .single();

  if (insertError) {
    return errorResponse(
      "Failed to store consultation",
      500,
      insertError.message,
    );
  }

  return jsonResponse(
    {
      glyphs: selectedGlyphs,
      word: selectedWord,
      consultation_id: consultation.id,
      latency_ms: latencyMs,
    },
    200,
  );
});
