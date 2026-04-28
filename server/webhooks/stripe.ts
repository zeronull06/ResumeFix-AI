import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { paymentSessions } from "../../drizzle/schema";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(secretKey, { apiVersion: "2024-04-10" });
}

export function registerStripeWebhook(app: Express) {
  app.post(
    "/api/stripe/webhook",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"] as string;
      const secret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!secret) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      let event: Stripe.Event;
      try {
        const stripe = getStripe();
        const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err);
        return res.status(401).json({ error: "Invalid signature" });
      }

      console.log(`[Stripe Webhook] Event type: ${event.type}`);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const analysisId = session.metadata?.analysis_id ? parseInt(session.metadata.analysis_id) : null;
        const accessToken = session.metadata?.access_token ?? null;

        if (!analysisId || !accessToken) {
          console.error("[Stripe Webhook] Missing analysis_id or access_token in metadata");
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
                stripeSessionId: session.id,
                amountCents: session.amount_total ?? 0,
                customerEmail: session.customer_email,
              })
              .where(eq(paymentSessions.id, existing.id));
          } else {
            await db.insert(paymentSessions).values({
              analysisId,
              stripeSessionId: session.id,
              status: "paid",
              amountCents: session.amount_total ?? 0,
              customerEmail: session.customer_email,
            });
          }

          console.log(`[Stripe Webhook] Payment confirmed for analysis ${analysisId}`);
        } catch (err) {
          console.error("[Stripe Webhook] DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }
      }

      return res.status(200).json({ received: true });
    }
  );
}
