/**
 * ingest-audio — Supabase Edge Function
 *
 * Receives raw WAV audio from the Maddi device via HTTP POST.
 * Pipeline:
 *   1. Deepgram Nova-2 — speech-to-text (transcript, keywords, topics)
 *   2. Claude Haiku — mood classification from transcript + contextual metadata
 *
 * Returns transcript and mood-related details without persisting them.
 *
 * Auth: Device API key via X-Device-Key header (see _shared/auth.ts)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { chat } from "../_shared/llm.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY")!;

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen" +
  "?model=nova-2-general" +
  "&smart_format=true" +
  "&punctuate=true" +
  "&keywords=true" +
  "&topics=true" +
  "&language=en-US";

const MIN_TRANSCRIPT_LENGTH = 3;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

const CLASSIFY_PROMPT =
  `You are analyzing speech and context signals from a wearable device's microphone.
Given whatever information is available (transcript, audio level, device motion, or both), classify only mood-related signals.
Do NOT classify the physical environment. Do NOT infer ambient sound events. Do NOT describe surroundings.
Return ONLY a JSON object:
{
  "emotional_valence": one of: "positive", "neutral", "negative",
  "arousal": number 0.0 to 1.0 (0=calm, 1=excited/agitated)
}
Rules:
- Use transcript content when speech is available.
- You may use audio level and motion only as weak supporting context for energy/arousal, not to infer environment.
- If there is not enough evidence, default to neutral valence and moderate arousal.
Return ONLY the JSON, no explanation.`;

// ── Deepgram types ──
interface DeepgramWord {
  word: string;
  confidence: number;
}

interface DeepgramTopic {
  topic: string;
  confidence: number;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
    topics?: {
      segments?: Array<{
        topics?: Array<{
          topics?: DeepgramTopic[];
        }>;
      }>;
    };
  };
}

function extractKeywords(words: DeepgramWord[]): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const w of words) {
    const lower = w.word.toLowerCase();
    if (w.confidence >= HIGH_CONFIDENCE_THRESHOLD && !seen.has(lower)) {
      seen.add(lower);
      keywords.push(lower);
    }
  }
  return keywords;
}

function extractTopics(response: DeepgramResponse): string[] {
  const segments = response.results?.topics?.segments;
  if (!segments || segments.length === 0) return [];
  const topics: string[] = [];
  for (const segment of segments) {
    const topicGroup = segment.topics?.[0];
    if (topicGroup?.topics) {
      for (const t of topicGroup.topics) {
        if (t.topic && !topics.includes(t.topic)) {
          topics.push(t.topic);
        }
      }
    }
  }
  return topics;
}

// ── Classification result ──
interface ClassifyResult {
  emotional_valence: string;
  arousal: number;
}

async function classifyAudio(
  transcript: string | null,
  rmsDb: number | null,
  motionState: string | null
): Promise<ClassifyResult> {
  const defaults: ClassifyResult = {
    emotional_valence: "neutral",
    arousal: 0.5,
  };

  // Build context for Claude from whatever we have
  const parts: string[] = [];
  if (transcript && transcript.length >= MIN_TRANSCRIPT_LENGTH) {
    parts.push(`Transcript: "${transcript}"`);
  } else {
    parts.push("No speech detected in this audio capture.");
  }
  if (rmsDb !== null) {
    parts.push(`Audio energy level: ${rmsDb.toFixed(1)} dBFS`);
  }
  if (motionState) {
    parts.push(`Device motion: ${motionState}`);
  }

  const userMessage = parts.join("\n");

  try {
    const result = await chat(
      [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 250, temperature: 0.1 }
    );

    let jsonStr = result.content.trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];

    const parsed = JSON.parse(jsonStr);
    return {
      emotional_valence: parsed.emotional_valence ?? defaults.emotional_valence,
      arousal: typeof parsed.arousal === "number" ? Math.max(0, Math.min(1, parsed.arousal)) : defaults.arousal,
    };
  } catch (err) {
    console.log(`[Classify] Error: ${err}`);
    return defaults;
  }
}

// ── Main handler ──
serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const deviceId = await authenticateDevice(req);
  if (!deviceId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const audioBuffer = await req.arrayBuffer();
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    return new Response(
      JSON.stringify({ error: "No audio body provided" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Step 1: Deepgram STT ──
  let transcript = "";
  let keywords: string[] = [];
  let topics: string[] = [];

  try {
    const dgResponse = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/wav",
      },
      body: audioBuffer,
    });

    if (dgResponse.ok) {
      const dgResult: DeepgramResponse = await dgResponse.json();
      transcript = dgResult.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
      const words = dgResult.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
      keywords = extractKeywords(words);
      topics = extractTopics(dgResult);
    } else {
      console.log(`[Deepgram] HTTP ${dgResponse.status}`);
    }
  } catch (err) {
    console.log(`[Deepgram] Error: ${err}`);
  }

  // ── Read device metadata from headers ──
  const motionState = req.headers.get("X-Motion-State") ?? null;
  const noiseFloorDb = req.headers.get("X-Audio-Rms-Db")
    ? parseFloat(req.headers.get("X-Audio-Rms-Db")!)
    : null;

  // ── Step 2: Classify mood-related signals only ──
  const classification = await classifyAudio(transcript, noiseFloorDb, motionState);

  return new Response(
    JSON.stringify({
      persisted: false,
      transcript,
      keywords,
      topics,
      emotion: classification.emotional_valence,
      arousal: classification.arousal,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
