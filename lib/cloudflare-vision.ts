const ALT_TEXT_PROMPT = `Write ONE short sentence of alt text for this image, max 120 characters total.

Hard rules:
- 120 characters maximum. Going over is a failure.
- Single sentence. No second sentence.
- Describe what is visually meaningful or distinctive, not just the page title.
- Do NOT begin with: "Image of", "Picture of", "Photo of", "Screenshot of", "A screenshot", "The image shows", "This is", or "Here is".
- Do NOT include preambles like "Sure!", "Here is", "Alt text:", or "Description:".
- Do NOT dump raw IDs, UUIDs, or timestamps. If there is a single meaningful headline or label in the image, you may include it in quotes.
- Avoid identifier-only outputs like "alt-text-tool" — describe what is shown, not just what it is named.
- If purely decorative, output exactly: DECORATIVE

Output ONLY the alt text. Nothing before, nothing after.`;

const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_CHARS = 125;

type CfResponse = {
  success?: boolean;
  result?: { response?: string } | string;
  errors?: Array<{ message?: string; code?: number }>;
};

const PREAMBLE_PATTERNS = [
  /^(sure|okay|certainly|of course)[,!.]?\s*/i,
  /^here\s+(is|are)\s+(the|some|a|an)\s+alt\s*text[:\s]*/i,
  /^(alt\s*text|description|caption)[:\s]+/i,
  /^the\s+image\s+(shows|depicts|features|is)\s+/i,
  /^this\s+(is|image\s+is|image\s+shows|photo\s+is)\s+/i,
  /^(image|picture|photo)\s+of\s+/i,
];

function cleanResponse(raw: string): string {
  let text = raw.trim();
  // Strip surrounding quotes.
  text = text.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Strip common LLM preambles.
  for (const re of PREAMBLE_PATTERNS) {
    const next = text.replace(re, "");
    if (next !== text) {
      text = next.trim();
      break;
    }
  }
  // Strip surrounding quotes again in case the preamble was inside them.
  text = text.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Drop trailing period.
  text = text.replace(/\.+$/, "").trim();

  if (text.length > MAX_CHARS) {
    // Try to break at last space within the limit so we don't cut mid-word.
    const slice = text.slice(0, MAX_CHARS);
    const lastSpace = slice.lastIndexOf(" ");
    text =
      lastSpace > MAX_CHARS - 20
        ? slice.slice(0, lastSpace).trim()
        : slice.trim();
  }

  return text;
}

export async function generateAltTextCloudflare(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare credentials not configured");
  }

  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You write concise, accessibility-compliant alt text for web images. Output exactly one short sentence under 120 characters with no preamble or explanation.",
        },
        {
          role: "user",
          content: ALT_TEXT_PROMPT,
        },
      ],
      image: dataUri,
      max_tokens: 50,
    }),
  });

  const data = (await res.json()) as CfResponse;

  if (!res.ok || data.success === false) {
    const msg = data.errors?.[0]?.message ?? `Cloudflare ${res.status}`;
    throw new Error(`cloudflare-vision: ${msg}`);
  }

  let raw: string | undefined;
  if (typeof data.result === "string") {
    raw = data.result;
  } else if (data.result && typeof data.result.response === "string") {
    raw = data.result.response;
  }

  if (!raw) throw new Error("cloudflare-vision: empty response");
  return cleanResponse(raw);
}
