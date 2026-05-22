import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CREDITS_PER_PURCHASE, getPolar } from "@/lib/polar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    }

    const productId = process.env.POLAR_PRODUCT_ID;
    if (!productId) {
      return NextResponse.json(
        { error: "POLAR_PRODUCT_ID not configured" },
        { status: 500 },
      );
    }

    const origin = new URL(req.url).origin;
    const polar = getPolar();
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl: `${origin}/?payment=success&checkout_id={CHECKOUT_ID}`,
      metadata: {
        user_id: user.id,
        credits: CREDITS_PER_PURCHASE,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
