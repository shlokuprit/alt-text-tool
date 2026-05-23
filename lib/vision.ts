import { generateAltText as geminiGenerate } from "./gemini";
import { generateAltTextCloudflare } from "./cloudflare-vision";

export type VisionProvider = "gemini" | "cloudflare";

export type VisionResult = {
  altText: string;
  provider: VisionProvider;
};

/**
 * Tries Gemini first. If Gemini fails with a recoverable error (quota
 * exceeded, overloaded, rate-limited), falls back to Cloudflare Workers AI
 * (Llama 3.2 Vision) so we keep serving users even when Gemini's free tier
 * is exhausted.
 */
export async function generateAltText(
  imageBase64: string,
  mimeType: string,
): Promise<VisionResult> {
  try {
    const text = await geminiGenerate(imageBase64, mimeType);
    return { altText: text, provider: "gemini" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!shouldFallback(msg)) {
      throw err;
    }
    console.warn("gemini failed, falling back to cloudflare:", msg);
    const text = await generateAltTextCloudflare(imageBase64, mimeType);
    return { altText: text, provider: "cloudflare" };
  }
}

function shouldFallback(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("daily ai quota") ||
    lower.includes("rate-limited") ||
    lower.includes("rate limited") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("overloaded") ||
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("temporarily unavailable")
  );
}
