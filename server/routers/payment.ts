import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { analyses, paymentSessions } from "../../drizzle/schema";

const LS_API_URL = "https://api.lemonsqueezy.com/v1";

function getLSHeaders() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
  };
}

/** Create a Lemon Squeezy checkout URL for a given analysis */
export async function createLSCheckout(
  analysisId: number,
  accessToken: string,
  origin: string
): Promise<string> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

  if (!storeId || !variantId) {
    throw new Error("Lemon Squeezy STORE_ID or VARIANT_ID not configured");
  }

  const successUrl = `${origin}/results/${accessToken}?payment=success`;
  const cancelUrl = `${origin}/analyze?payment=cancelled`;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
        checkout_data: {
          custom: {
            analysis_id: String(analysisId),
            access_token: accessToken,
          },
        },
        product_options: {
          redirect_url: successUrl,
        },
        expires_at: null,
      },
      relationships: {
        store: {
          data: { type: "stores", id: storeId },
        },
        variant: {
          data: { type: "variants", id: variantId },
        },
      },
    },
  };

  const response = await fetch(`${LS_API_URL}/checkouts`, {
    method: "POST",
    headers: getLSHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lemon Squeezy checkout failed: ${err}`);
  }

  const data = await response.json() as {
    data: { attributes: { url: string } };
  };

  return data.data.attributes.url;
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────
export const paymentRouter = router({
  /** Create checkout session and return the Lemon Squeezy checkout URL */
  createCheckout: publicProcedure
    .input(
      z.object({
        accessToken: z.string(),
        origin: z.string().url(),
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

      // Check if already paid
      const [existing] = await db
        .select()
        .from(paymentSessions)
        .where(eq(paymentSessions.analysisId, analysis.id))
        .limit(1);

      if (existing?.status === "paid") {
        return { checkoutUrl: null, alreadyPaid: true };
      }

      const checkoutUrl = await createLSCheckout(analysis.id, input.accessToken, input.origin);

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
});
