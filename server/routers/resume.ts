import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import OpenAI from "openai";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { analyses, paymentSessions } from "../../drizzle/schema";

// ─── OpenAI Client ────────────────────────────────────────────────────────────
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

// ─── AI Helpers ───────────────────────────────────────────────────────────────
async function runFullAnalysis(resumeText: string, jobDescription: string) {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert ATS analyst and professional resume consultant with 10+ years of experience. Analyze resumes with precision and provide actionable, specific feedback.`,
      },
      {
        role: "user",
        content: `Analyze this resume against the job description and return a JSON object.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "atsScore": <integer 0-100>,
  "scoreBreakdown": {
    "keywordMatch": <integer 0-100>,
    "experienceRelevance": <integer 0-100>,
    "educationMatch": <integer 0-100>,
    "structureScore": <integer 0-100>
  },
  "summary": "<2-sentence summary of match quality>",
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": [
    {
      "section": "<Summary|Experience|Skills|Education|Format>",
      "issue": "<specific problem found>",
      "suggestion": "<specific actionable fix>",
      "priority": "<high|medium|low>"
    }
  ]
}

Rules:
- atsScore: weighted average (keywords 40%, experience 30%, education 15%, structure 15%)
- missingKeywords: exact terms from JD missing in resume (max 12)
- suggestions: 4-6 specific, actionable items ordered by priority`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as {
    atsScore: number;
    scoreBreakdown: { keywordMatch: number; experienceRelevance: number; educationMatch: number; structureScore: number };
    summary: string;
    missingKeywords: string[];
    suggestions: { section: string; issue: string; suggestion: string; priority: string }[];
  };
}

async function generateOptimizedResume(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  suggestions: { section: string; suggestion: string }[]
) {
  const openai = getOpenAI();
  const improvementsList = suggestions.map((s) => `- [${s.section}] ${s.suggestion}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a professional resume writer specializing in ATS optimization. Rewrite resumes to maximize ATS scores while maintaining authenticity and readability.`,
      },
      {
        role: "user",
        content: `Rewrite this resume to be optimized for the job description.

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

MISSING KEYWORDS TO INCORPORATE:
${missingKeywords.join(", ")}

KEY IMPROVEMENTS:
${improvementsList}

Rules:
1. Naturally incorporate all missing keywords — no keyword stuffing
2. Quantify achievements with specific numbers where possible
3. Use strong action verbs at the start of bullet points
4. Align the professional summary with the job requirements
5. Reorganize skills to prioritize relevant ones first
6. Keep all factual information accurate — never fabricate experience
7. Format using clean markdown with ## headings for sections
8. Return ONLY the complete rewritten resume in markdown format`,
      },
    ],
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("No response from OpenAI");
  return raw;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const resumeRouter = router({
  /** Extract text from a base64-encoded PDF */
  extractPdf: publicProcedure
    .input(z.object({ base64: z.string(), filename: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const buffer = Buffer.from(input.base64, "base64");
        const data = await pdfParse(buffer);
        return { text: data.text.trim() };
      } catch {
        throw new Error("Failed to parse PDF. Please paste your resume text manually.");
      }
    }),

  /** Step 1: Save resume+JD draft, return accessToken for checkout */
  createDraft: publicProcedure
    .input(
      z.object({
        resumeText: z.string().min(50, "Resume must be at least 50 characters"),
        jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const accessToken = nanoid(32);
      const userId = ctx.user?.id ?? null;

      const [result] = await db
        .insert(analyses)
        .values({
          userId,
          accessToken,
          resumeText: input.resumeText,
          jobDescription: input.jobDescription,
          status: "pending",
        })
        .$returningId();

      return { analysisId: result.id, accessToken };
    }),

  /** Step 3: Run AI analysis — called after payment confirmed */
  runAnalysis: publicProcedure
    .input(z.object({ accessToken: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [analysis] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.accessToken, input.accessToken))
        .limit(1);

      if (!analysis) throw new Error("Analysis not found");
      if (analysis.status === "done") return { status: "done" as const };
      if (analysis.status === "processing") return { status: "processing" as const };

      // Verify payment
      const [payment] = await db
        .select()
        .from(paymentSessions)
        .where(eq(paymentSessions.analysisId, analysis.id))
        .limit(1);

      if (!payment || payment.status !== "paid") {
        throw new Error("Payment not confirmed");
      }

      await db.update(analyses).set({ status: "processing" }).where(eq(analyses.id, analysis.id));

      try {
        const full = await runFullAnalysis(analysis.resumeText, analysis.jobDescription);
        const optimizedResume = await generateOptimizedResume(
          analysis.resumeText,
          analysis.jobDescription,
          full.missingKeywords,
          full.suggestions.map((s) => ({ section: s.section, suggestion: s.suggestion }))
        );

        await db
          .update(analyses)
          .set({
            atsScore: full.atsScore,
            scoreBreakdown: full.scoreBreakdown,
            summary: full.summary,
            missingKeywords: full.missingKeywords,
            suggestions: full.suggestions,
            optimizedResume,
            status: "done",
          })
          .where(eq(analyses.id, analysis.id));

        return { status: "done" as const };
      } catch (err) {
        await db.update(analyses).set({ status: "failed" }).where(eq(analyses.id, analysis.id));
        throw err;
      }
    }),

  /** Get analysis result by accessToken */
  getResult: publicProcedure
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

      return {
        id: analysis.id,
        status: analysis.status,
        atsScore: analysis.atsScore,
        scoreBreakdown: analysis.scoreBreakdown,
        summary: analysis.summary,
        missingKeywords: analysis.missingKeywords,
        suggestions: analysis.suggestions,
        optimizedResume: analysis.optimizedResume,
        createdAt: analysis.createdAt,
      };
    }),

  /** Check payment status */
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
        analysisStatus: analysis.status,
        paymentStatus: payment?.status ?? "pending",
        checkoutUrl: payment?.checkoutUrl ?? null,
      };
    }),
});
