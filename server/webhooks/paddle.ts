import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { paymentSessions } from "../../drizzle/schema";

interface PaddleWebhookEvent {
  event_type: string;
  data: {
    id: string;
    status: string;
    custom_data?: {
      analysis_id?: string;
      access_token?: string;
    };
    details?: {
      totals?: {
        total?: string;
      };
    };
    customer?: {
      email?: string;
    };
  };
}

function verifyPaddleSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  try {
    // Paddle uses ts=timestamp;h1=hash format
    const parts: Record<string, string> = {};
    signature.split(";").forEach((part) => {
      const [key, value] = part.split("=");
      if (key && value) parts[key] = value;
    });

    const ts = parts["ts"];
    const h1 = parts["h1"];
    if (!ts || !h1) return false;

    const signedPayload = `${ts}:${rawBody.toString("utf-8")}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(signedPayload);
    const digest = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

export function registerPaddleWebhook(app: Express) {
  app.post(
    "/api/paddle/webhook",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (req: Request, res: Response) => {
      const signature = req.headers["paddle-signature"] as string;
      const secret = process.env.PADDLE_WEBHOOK_SECRET;

      if (!secret) {
        console.error("[Paddle Webhook] PADDLE_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));

      if (!signature || !verifyPaddleSignature(rawBody, signature, secret)) {
        console.error("[Paddle Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const payload = req.body as PaddleWebhookEvent;
      const eventType = payload?.event_type;
      console.log(`[Paddle Webhook] Event: ${eventType}`);

      if (eventType === "transaction.completed") {
        const customData = payload.data?.custom_data;
        const analysisId = customData?.analysis_id ? parseInt(customData.analysis_id) : null;
        const paddleTransactionId = payload.data?.id;
        const amountStr = payload.data?.details?.totals?.total;
        const amountCents = amountStr ? Math.round(parseFloat(amountStr) * 100) : 0;
        const customerEmail = payload.data?.customer?.email ?? null;

        if (!analysisId) {
          console.error("[Paddle Webhook] Missing analysis_id in custom_data");
          return res.status(200).json({ received: true });
        }

        try {
          const db = await getDb();
          if (!db) throw new Error("Database unavailable");

          const [existing] = await db
            .select()
            .from(paymentSessions)
            .where(eq(paymentSessions.analysisId, analysisId))
            .limit(1);

          if (existing) {
            await db
              .update(paymentSessions)
              .set({
                status: "paid",
                paddleTransactionId,
                amountCents,
                customerEmail,
              })
              .where(eq(paymentSessions.id, existing.id));
          } else {
            await db.insert(paymentSessions).values({
              analysisId,
              paddleTransactionId,
              status: "paid",
              amountCents,
              customerEmail,
            });
          }

          console.log(`[Paddle Webhook] Payment confirmed for analysis ${analysisId}`);
        } catch (err) {
          console.error("[Paddle Webhook] DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }
      }

      return res.status(200).json({ received: true });
    }
  );
}
