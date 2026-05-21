import { NextRequest, NextResponse } from "next/server";
import { generateAltText } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 4MB" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");
    const altText = await generateAltText(base64, file.type);

    return NextResponse.json({ altText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", err);
    const status = message.includes("API key") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
