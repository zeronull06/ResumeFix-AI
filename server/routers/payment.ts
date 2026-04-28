import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { analyses, paymentSessions } from "../../drizzle/schema";

// Paddle Billing API base URL
const PADDLE_API_URL = "https://api.paddle.com";

function getPaddleHeaders() {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// Create Paddle checkout transaction
export async function createPaddleCheckout(
  analysisId: number,
  accessToken: string,
  origin: string,
  userEmail?: string
): Promise<string> {
  const priceId = process.env.PADDLE_PRICE_ID;
  if (!priceId) throw new Error("PADDLE_PRICE_ID is not configured");

  const successUrl = `${origin}/results/${accessToken}?payment=success`;

  const body = {
    items: [{ price_id: priceId, quantity: 1 }],
    customer: userEmail ? { email: userEmail } : undefined,
    custom_data: {
      analysis_id: String(analysisId),
      access_token: accessToken,
    },
    settings: {
      success_url: successUrl,
      display_mode: "redirect",
      theme: "light",
    },
  };

  const response = await fetch(`${PADDLE_API_URL}/transactions`, {
    method: "POST",
    headers: getPaddleHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Paddle checkout failed: ${err}`);
  }

  const data = await response.json() as {
    data: { checkout: { url: string } };
  };

  return data.data.checkout.url;
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

      const checkoutUrl = await createPaddleCheckout(
        analysis.id,
        input.accessToken,
        input.origin,
        input.email
      );

      if (existing) {
        await db
          .update(paymentSessions)
          .set({ checkoutUrl })
          .where(eq(paymentSessions.id, existing.id));
      } else {
        await db.insert(paymentSessions).values({
          analysisId: analysis.id,
          checkoutUrl,
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
