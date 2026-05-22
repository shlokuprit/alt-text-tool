import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PolarOrderPaidEvent = {
  type: "order.paid";
  data: {
    id: string;
    netAmount: number;
    customer: { externalId: string | null; email: string };
    metadata?: Record<string, string | number | boolean>;
  };
};

type PolarEvent =
  | PolarOrderPaidEvent
  | { type: string; data: { id?: string } & Record<string, unknown> };

export async function POST(req: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("POLAR_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let event: PolarEvent;
  try {
    let cleaned = secret.trim();
    // Polar emits secrets with the polar_whs_ prefix; standardwebhooks
    // only strips its own whsec_ prefix. Normalise here.
    for (const p of ["polar_whsec_", "polar_whs_", "whsec_"]) {
      if (cleaned.startsWith(p)) {
        cleaned = cleaned.slice(p.length);
        break;
      }
    }
    const keyBytes = new Uint8Array(Buffer.from(cleaned, "base64"));
    const wh = new Webhook(keyBytes, { format: "raw" });
    event = wh.verify(body, headers) as PolarEvent;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("WEBHOOK signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const errName = err instanceof Error ? err.name : "unknown";
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("WEBHOOK constructor or verify failed:", {
      errName,
      errMsg,
      secretLen: secret.length,
      secretPrefix: secret.slice(0, 7),
      bodyLen: body.length,
      hasId: !!headers["webhook-id"],
      hasSig: !!headers["webhook-signature"],
      hasTs: !!headers["webhook-timestamp"],
    });
    return NextResponse.json(
      { error: "Webhook error", detail: errMsg },
      { status: 400 },
    );
  }

  if (event.type !== "order.paid") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const order = (event as PolarOrderPaidEvent).data;
  const eventId = headers["webhook-id"] || `order:${order.id}`;
  const metadataUserId =
    typeof order.metadata?.user_id === "string"
      ? order.metadata.user_id
      : null;
  const userId = metadataUserId ?? order.customer.externalId;
  const creditsRaw = order.metadata?.credits;
  const credits =
    typeof creditsRaw === "number"
      ? creditsRaw
      : typeof creditsRaw === "string"
        ? Number(creditsRaw)
        : 500;

  if (!userId) {
    console.error("webhook: missing user_id in order", order.id);
    return NextResponse.json({ received: true, error: "no user_id" });
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("payment_events").insert({
    event_id: eventId,
    user_id: userId,
    credits_added: credits,
    raw_event: {
      type: event.type,
      order_id: order.id,
      amount: order.netAmount,
    },
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, idempotent: true });
    }
    console.error("webhook: insert event failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: rpcError } = await admin.rpc("add_paid_credits", {
    p_user_id: userId,
    p_amount: credits,
  });

  if (rpcError) {
    console.error("webhook: add_paid_credits failed:", rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, credits_added: credits });
}
