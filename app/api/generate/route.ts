import { NextRequest, NextResponse } from "next/server";
import { generateAltText } from "@/lib/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decrementCredits, getOrInitCredits } from "@/lib/credits";

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
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use the tool" }, { status: 401 });
    }

    const state = await getOrInitCredits(user.id);
    if (state.credits_remaining <= 0) {
      return NextResponse.json(
        {
          error: "Daily free limit reached. Credits refill at 00:00 UTC.",
          creditsRemaining: 0,
        },
        { status: 429 },
      );
    }

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

    const creditsRemaining = await decrementCredits(user.id);
    return NextResponse.json({ altText, creditsRemaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
