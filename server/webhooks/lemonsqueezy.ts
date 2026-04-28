import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { analyses, paymentSessions } from "../../drizzle/schema";

interface LSOrderPayload {
  meta: {
    event_name: string;
    custom_data?: {
      analysis_id?: string;
      access_token?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      total: number;
      user_email: string;
      identifier: string;
    };
  };
}

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export function registerLemonSqueezyWebhook(app: Express) {
  // Must use raw body for signature verification
  app.post(
    "/api/lemonsqueezy/webhook",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (req: Request, res: Response) => {
      const signature = req.headers["x-signature"] as string;
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

      if (!secret) {
        console.error("[LS Webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      // Get raw body
      const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));

      if (!signature || !verifySignature(rawBody, signature, secret)) {
        console.error("[LS Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const payload = req.body as LSOrderPayload;
      const eventName = payload?.meta?.event_name;

      console.log(`[LS Webhook] Event: ${eventName}`);

      if (eventName === "order_created") {
        const customData = payload.meta.custom_data;
        const analysisId = customData?.analysis_id ? parseInt(customData.analysis_id) : null;
        const accessToken = customData?.access_token ?? null;
        const lsOrderId = payload.data?.id;
        const amountCents = payload.data?.attributes?.total ?? 0;
        const customerEmail = payload.data?.attributes?.user_email ?? null;

        if (!analysisId || !accessToken) {
          console.error("[LS Webhook] Missing analysis_id or access_token in custom_data");
          return res.status(200).json({ received: true });
        }

        try {
          const db = await getDb();
          if (!db) throw new Error("Database unavailable");

          // Update or create payment session
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
                lsOrderId,
                amountCents,
                customerEmail,
              })
              .where(eq(paymentSessions.id, existing.id));
          } else {
            await db.insert(paymentSessions).values({
              analysisId,
              lsOrderId,
              status: "paid",
              amountCents,
              customerEmail,
            });
          }

          // Keep analysis status as 'pending' so the frontend can trigger runAnalysis
          // The frontend polls checkPayment; when paymentStatus=paid & analysisStatus=pending, it calls runAnalysis
          console.log(`[LS Webhook] Payment confirmed for analysis ${analysisId} — ready for AI processing`);
        } catch (err) {
          console.error("[LS Webhook] DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }
      }

      return res.status(200).json({ received: true });
    }
  );
}
