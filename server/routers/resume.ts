import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import OpenAI from "openai";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { analyses } from "../../drizzle/schema";

// OpenAI Client
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

// AI Helpers
async function runFullAnalysis(resumeText: string, jobDescription: string) {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert ATS analyst and professional resume consultant with 10+ years of experience across all industries — including business, marketing, finance, operations, healthcare, education, and more. Analyze resumes with precision and provide actionable, industry-appropriate feedback. Do NOT assume the role is in software or programming unless explicitly stated in the job description.`,
      },
      {
        role: "user",
        content: `Analyze this resume against the job description and return a JSON object.\n\nRESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn ONLY valid JSON (no markdown, no explanation) with this exact structure:\n{\n  "atsScore": <integer 0-100>,\n  "scoreBreakdown": {\n    "keywordMatch": <integer 0-100>,\n    "experienceRelevance": <integer 0-100>,\n    "educationMatch": <integer 0-100>,\n    "structureScore": <integer 0-100>\n  },\n  "summary": "<2-sentence summary of match quality>",\n  "missingKeywords": ["keyword1", "keyword2"],\n  "suggestions": [\n    {\n      "section": "<Summary|Experience|Skills|Education|Format>",\n      "issue": "<specific problem found>",\n      "suggestion": "<specific actionable fix>",\n      "priority": "<high|medium|low>"\n    }\n  ]\n}\n\nRules:\n- atsScore: weighted average (keywords 40%, experience 30%, education 15%, structure 15%)\n- missingKeywords: exact terms from JD missing in resume — use industry-appropriate terms, NOT programming terms unless the JD is for a tech role (max 12)\n- suggestions: 4-6 specific, actionable items ordered by priority\n- Focus on the actual industry and role described in the JD`,
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
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional resume writer with expertise across all industries — business, marketing, finance, operations, healthcare, education, and more. Rewrite resumes to maximize ATS scores while maintaining authenticity and readability. Do NOT add programming or technical skills unless the original resume or job description explicitly requires them. Write in a professional, human tone appropriate for the specific industry.`,
      },
      {
        role: "user",
        content: `Rewrite this resume to be optimized for the job description below.\n\nORIGINAL RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nMISSING KEYWORDS TO INCORPORATE:\n${missingKeywords.join(", ")}\n\nKEY IMPROVEMENTS:\n${improvementsList}\n\nRules:\n1. Naturally incorporate all missing keywords — no keyword stuffing\n2. Quantify achievements with specific numbers where possible (e.g., "Increased sales by 30%", "Managed a team of 8")\n3. Use strong action verbs at the start of bullet points (e.g., Led, Developed, Managed, Achieved)\n4. Align the professional summary with the job requirements\n5. Reorganize skills to prioritize relevant ones first\n6. Keep all factual information accurate — NEVER fabricate experience or skills\n7. Do NOT add technical/programming skills unless the original resume or JD requires them\n8. Format using clean markdown:\n   - # Full Name (top, centered)\n   - Contact info on one line below name\n   - ## SECTION HEADINGS (e.g., ## PROFESSIONAL SUMMARY, ## EXPERIENCE, ## EDUCATION, ## SKILLS)\n   - ### Job Title | Company | Date range (for each role)\n   - Bullet points with - for responsibilities/achievements\n9. Return ONLY the complete rewritten resume in markdown format — no explanations, no preamble`,
      },
    ],
    temperature: 0.4,
  });
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("No response from OpenAI");
  return raw;
}

// Router
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

  /**
   * Save draft — stores resume+JD, returns accessToken for payment flow.
   * Does NOT run AI yet — AI runs after payment confirmed.
   */
  saveDraft: publicProcedure
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
      await db.insert(analyses).values({
        userId,
        accessToken,
        resumeText: input.resumeText,
        jobDescription: input.jobDescription,
        status: "pending",
      });
      return { accessToken };
    }),

  /**
   * Run AI analysis — called after payment is confirmed.
   * Frontend calls this after Lemon Squeezy webhook confirms payment.
   */
  analyze: publicProcedure
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

      // Mark as processing
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
});
