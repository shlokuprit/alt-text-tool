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

export async function generateAltText(
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
}
