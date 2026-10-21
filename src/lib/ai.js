import "server-only";
import OpenAI from "openai";
import { db } from "./db";
import { readSecret } from "./secrets";

/**
 * NVIDIA NIM exposes an OpenAI-compatible API, so we reuse the OpenAI SDK.
 * Text:   Nemotron 3 Super 120B (reasoning disabled for speed).
 * Vision: Nemotron 3.5 Super VL 120B.
 * NVIDIA retires hosted models regularly (404/410), so each call walks a fallback chain.
 */
const client = (apiKey) =>
  new OpenAI({
    apiKey,
    baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    timeout: 90_000,
    maxRetries: 1,
  });

export const TEXT_MODEL = process.env.NVIDIA_TEXT_MODEL || "nvidia/nemotron-3-super-120b-a12b";
export const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || "nvidia/nemotron-3.5-super-vl-120b-a12b";
const TEXT_FALLBACKS = [TEXT_MODEL, "nvidia/nemotron-3.5-super-vl-120b-a12b", "meta/llama-3.2-11b-vision-instruct"];
const VISION_FALLBACKS = [VISION_MODEL, "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"];

// The key can be set in Admin → Settings → AI (stored encrypted, see lib/secrets.js) or via the
// NVIDIA_API_KEY env var. The admin-set key wins. Cached briefly so each AI call doesn't hit the DB.
let keyCache = { at: 0, value: null, source: null };
const KEY_TTL_MS = 30_000;

export async function getNvidiaKey() {
  if (Date.now() - keyCache.at < KEY_TTL_MS) return keyCache;
  let value = null;
  let source = null;
  try {
    const stored = await readSecret("nvidia_api_key");
    if (stored?.value) [value, source] = [stored.value, "admin"];
  } catch {}
  if (!value && process.env.NVIDIA_API_KEY) [value, source] = [process.env.NVIDIA_API_KEY, "env"];
  keyCache = { at: Date.now(), value, source };
  return keyCache;
}

export const invalidateNvidiaKey = () => (keyCache = { at: 0, value: null, source: null });

export async function aiEnabled() {
  return Boolean((await getNvidiaKey()).value);
}

async function requireKey() {
  const { value } = await getNvidiaKey();
  if (!value) throw new Error("NVIDIA API key is not configured (Admin → Settings → AI)");
  return value;
}

/**
 * Validates a key against NVIDIA without saving it. The model list is public, so the real check is a
 * tiny completion, tried along the same fallback chain the app uses (models get retired per account).
 */
export async function testNvidiaKey(apiKey) {
  const tried = [];
  for (const m of chain(TEXT_MODEL)) {
    try {
      const out = await client(apiKey).chat.completions.create({
        model: m,
        max_tokens: 5,
        messages: [{ role: "user", content: "Reply OK" }],
        chat_template_kwargs: { enable_thinking: false },
      });
      return { ok: true, textModel: m, fallback: m !== TEXT_MODEL, reply: (out.choices[0]?.message?.content || "OK").trim().slice(0, 20) };
    } catch (e) {
      if (e.status === 401 || e.status === 403) return { ok: false, error: "NVIDIA rejected this key (invalid, revoked or no access)" };
      tried.push(`${m}: ${e.status || e.message}`);
      if (!retriable(e)) break;
    }
  }
  return { ok: false, error: `The key works but no AI model answered (${tried.join("; ")})` };
}

async function log(task, model, ok, tokens, error) {
  try {
    await db.aiLog.create({ data: { task, model, ok, tokens: tokens ?? null, error: error ? String(error).slice(0, 500) : null } });
  } catch {}
}

const chain = (model) => [...new Set(model === VISION_MODEL ? VISION_FALLBACKS : model === TEXT_MODEL ? TEXT_FALLBACKS : [model, ...TEXT_FALLBACKS])];
// Model gone / not enabled for this key / overloaded → try the next model.
const retriable = (e) => [404, 410, 429, 500, 502, 503, 504].includes(e?.status) || /timed? ?out|aborted/i.test(e?.message || "");
const stripThink = (t) => (t || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

function params(model, { system, messages, temperature, maxTokens, stream }) {
  return {
    model,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
    stream,
    // Nemotron hybrid-reasoning models: answer directly (≈3× faster); ignored by other models.
    chat_template_kwargs: { enable_thinking: false },
    messages: system ? [{ role: "system", content: system }, ...messages] : messages,
  };
}

/** Plain chat completion -> string. */
export async function chat({ task = "chat", system, messages, model = TEXT_MODEL, temperature = 0.4, maxTokens = 1200 }) {
  const apiKey = await requireKey();
  let lastErr;
  for (const m of chain(model)) {
    try {
      const res = await client(apiKey).chat.completions.create(params(m, { system, messages, temperature, maxTokens, stream: false }));
      await log(task, m, true, res.usage?.total_tokens);
      return stripThink(res.choices[0]?.message?.content);
    } catch (e) {
      lastErr = e;
      await log(task, m, false, null, e.message);
      if (!retriable(e)) break;
    }
  }
  throw lastErr;
}

/** Streaming chat completion -> ReadableStream of UTF-8 text chunks. */
export async function chatStream({ task = "chat-stream", system, messages, model = TEXT_MODEL, temperature = 0.5, maxTokens = 700 }) {
  const apiKey = await requireKey();
  let stream, used, lastErr;
  for (const m of chain(model)) {
    try {
      stream = await client(apiKey).chat.completions.create(params(m, { system, messages, temperature, maxTokens, stream: true }));
      used = m;
      break;
    } catch (e) {
      lastErr = e;
      await log(task, m, false, null, e.message);
      if (!retriable(e)) break;
    }
  }
  if (!stream) throw lastErr;
  log(task, used, true);
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let inThink = false;
      try {
        for await (const chunk of stream) {
          let t = chunk.choices[0]?.delta?.content;
          if (!t) continue;
          if (t.includes("<think>")) inThink = true;
          if (inThink) {
            if (!t.includes("</think>")) continue;
            t = t.split("</think>").pop();
            inThink = false;
          }
          if (t) controller.enqueue(enc.encode(t));
        }
      } catch {
        controller.enqueue(enc.encode("\n[connection interrupted]"));
      }
      controller.close();
    },
  });
}

/** Pull the first balanced JSON object/array out of a model reply. */
export function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return null;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try {
        return JSON.parse(body.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Chat that must return JSON; retries once with a stricter nudge. */
export async function chatJson(opts) {
  const first = await chat({ ...opts, temperature: opts.temperature ?? 0.2 });
  const parsed = extractJson(first);
  if (parsed) return parsed;
  const retry = await chat({
    ...opts,
    temperature: 0,
    messages: [
      ...opts.messages,
      { role: "assistant", content: first },
      { role: "user", content: "Return ONLY valid minified JSON. No prose, no markdown." },
    ],
  });
  const p2 = extractJson(retry);
  if (!p2) throw new Error("AI did not return valid JSON");
  return p2;
}

/** Vision: image (data URL or https URL) + prompt -> JSON. */
export async function visionJson({ task = "vision", imageUrl, prompt, maxTokens = 1400 }) {
  return chatJson({
    task,
    model: VISION_MODEL,
    maxTokens,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
}
