import { NextRequest, NextResponse } from "next/server";
import { generateAltText } from "@/lib/vision";
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
    if (state.daily + state.paid <= 0) {
      return NextResponse.json(
        {
          error: "No credits. Free credits refill at 00:00 UTC, or buy more.",
          credits: state,
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
    const { altText, provider } = await generateAltText(base64, file.type);

    const credits = await decrementCredits(user.id);
    return NextResponse.json({ altText, credits, provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", {
      message,
      name: err instanceof Error ? err.name : undefined,
      stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
