import { z } from "zod";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { analyses, paymentSessions } from "../../drizzle/schema";

// Stripe Client
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(secretKey, { apiVersion: "2024-04-10" });
}

// Create Checkout Session
export async function createStripeCheckout(
  analysisId: number,
  accessToken: string,
  origin: string,
  userEmail?: string
): Promise<string> {
  const stripe = getStripe();
  const successUrl = `${origin}/results/${accessToken}?payment=success`;
  const cancelUrl = `${origin}/analyze?payment=cancelled`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Optimized Resume",
            description: "AI-powered resume optimization with ATS analysis",
          },
          unit_amount: 699,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      analysis_id: String(analysisId),
      access_token: accessToken,
    },
  });

  if (!session.url) throw new Error("Failed to create Stripe checkout session");
  return session.url;
}

// tRPC Router
export const paymentRouter = router({
  createCheckout: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        origin: z.string().url(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [analysis] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.accessToken, input.accessToken))
        .limit(1);

      if (!analysis) throw new Error("Analysis not found");

      const [existing] = await db
        .select()
        .from(paymentSessions)
        .where(eq(paymentSessions.analysisId, analysis.id))
        .limit(1);

      if (existing?.status === "paid") {
        return { checkoutUrl: null, alreadyPaid: true };
      }

      const checkoutUrl = await createStripeCheckout(
        analysis.id,
        input.accessToken,
        input.origin,
        input.email
      );

      if (existing) {
        await db
          .update(paymentSessions)
          .set({ stripeCheckoutUrl: checkoutUrl })
          .where(eq(paymentSessions.id, existing.id));
      } else {
        await db.insert(paymentSessions).values({
          analysisId: analysis.id,
          stripeCheckoutUrl: checkoutUrl,
          status: "pending",
        });
      }

      return { checkoutUrl, alreadyPaid: false };
    }),

  checkPayment: publicProcedure
    .input(z.object({ accessToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [analysis] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.accessToken, input.accessToken))
        .limit(1);

      if (!analysis) throw new Error("Analysis not found");

      const [payment] = await db
        .select()
        .from(paymentSessions)
        .where(eq(paymentSessions.analysisId, analysis.id))
        .limit(1);

      return {
        paymentStatus: payment?.status ?? "none",
        analysisStatus: analysis.status,
      };
    }),
});
