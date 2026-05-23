import { GoogleGenAI } from "@google/genai";

const ALT_TEXT_PROMPT = `Generate alt text for this image, following web accessibility best practices.

Rules:
- Under 125 characters.
- Do NOT begin with "Image of", "Picture of", or "Photo of".
- Describe what is meaningful or distinctive about the image.
- If there is readable text in the image, include it verbatim.
- Use plain language; no quotation marks; no trailing period.
- If the image is purely decorative, return: DECORATIVE

Return ONLY the alt text. No commentary, no labels, no quotes.`;

const MODEL = "gemini-2.0-flash";
const MAX_ATTEMPTS = 3;
const FALLBACK_BACKOFF_MS = 1000;
const MAX_WAIT_MS = 30_000;

let _client: GoogleGenAI | null = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type ParsedError = {
  retryable: boolean;
  waitMs: number;
  isDailyQuota: boolean;
  raw: unknown;
};

function parseGoogleError(err: unknown): ParsedError {
  const fallback: ParsedError = {
    retryable: false,
    waitMs: 0,
    isDailyQuota: false,
    raw: err,
  };
  if (!err || typeof err !== "object") return fallback;

  const e = err as { status?: number; code?: number; message?: string };
  const status = typeof e.status === "number" ? e.status : undefined;
  const code = typeof e.code === "number" ? e.code : undefined;
  const message = e.message ?? "";

  // Try to parse the embedded JSON error body Google sometimes sends as a string.
  let body: Record<string, unknown> | null = null;
  const jsonMatch = message.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      body = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      body = null;
    }
  }

  const httpCode =
    status ??
    code ??
    (body && typeof (body as { error?: { code?: number } }).error?.code === "number"
      ? (body as { error: { code: number } }).error.code
      : 0);

  const lowerMsg = message.toLowerCase();
  // Be strict — only flag as "daily" when Google explicitly names the per-day
  // quota id. A loose match catches per-minute errors too because their JSON
  // contains both "PerDay..." (the daily quota ID listed elsewhere) and
  // "quotaMetric".
  const isDaily =
    lowerMsg.includes("generaterequestsperday") ||
    /quotaid["':\s]+[^"']*perday/i.test(message) ||
    /requests per day/i.test(message);

  // Extract retryDelay (e.g. "53.2841763s" or "53s") from RetryInfo
  let waitMs = 0;
  const retryMatch = message.match(/retryDelay["':\s]+(\d+(?:\.\d+)?)s/i);
  if (retryMatch) {
    waitMs = Math.round(parseFloat(retryMatch[1]) * 1000);
  } else {
    const humanMatch = message.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (humanMatch) waitMs = Math.round(parseFloat(humanMatch[1]) * 1000);
  }

  const transientStatus =
    httpCode === 429 ||
    httpCode === 500 ||
    httpCode === 502 ||
    httpCode === 503 ||
    httpCode === 504;
  const transientMessage =
    lowerMsg.includes("overloaded") ||
    lowerMsg.includes("temporarily unavailable") ||
    lowerMsg.includes("resource_exhausted");

  return {
    retryable: (transientStatus || transientMessage) && !isDaily,
    waitMs,
    isDailyQuota: isDaily,
    raw: err,
  };
}

export async function generateAltText(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const ai = getClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: imageBase64, mimeType } },
              { text: ALT_TEXT_PROMPT },
            ],
          },
        ],
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty response from model");
      return text;
    } catch (err) {
      lastError = err;
      const parsed = parseGoogleError(err);

      if (parsed.isDailyQuota) {
        throw new Error(
          "Daily AI quota reached on our side. Try again in a few hours.",
        );
      }

      if (!parsed.retryable || attempt === MAX_ATTEMPTS) {
        throw err;
      }

      const wait =
        parsed.waitMs && parsed.waitMs <= MAX_WAIT_MS
          ? parsed.waitMs
          : FALLBACK_BACKOFF_MS * Math.pow(2, attempt - 1);

      if (parsed.waitMs > MAX_WAIT_MS) {
        // Server wants us to wait longer than we're willing to block on.
        throw new Error(
          "AI is temporarily rate-limited. Please retry in a minute.",
        );
      }

      console.warn(
        `gemini retryable error (attempt ${attempt}/${MAX_ATTEMPTS}), waiting ${wait}ms`,
      );
      await sleep(wait);
    }
  }

  throw lastError;
}
