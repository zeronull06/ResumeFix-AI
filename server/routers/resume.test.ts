import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock nanoid ──────────────────────────────────────────────────────────────
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test-access-token-abc123"),
}));

// ─── Mock OpenAI ──────────────────────────────────────────────────────────────
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  atsScore: 78,
                  scoreBreakdown: {
                    keywordMatch: 75,
                    experienceRelevance: 80,
                    educationMatch: 70,
                    structureScore: 85,
                  },
                  summary: "Good match with minor gaps.",
                  missingKeywords: ["Python", "Docker"],
                  suggestions: [
                    {
                      section: "Skills",
                      issue: "Missing Python",
                      suggestion: "Add Python to skills section",
                      priority: "high",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

// ─── Mock DB ──────────────────────────────────────────────────────────────────
const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: () => mockSelectChain,
    insert: () => mockInsertChain,
    update: () => mockUpdateChain,
  }),
}));

// ─── Samples ──────────────────────────────────────────────────────────────────
const SAMPLE_RESUME = `
John Doe — Software Engineer
john@example.com | (555) 123-4567

EXPERIENCE
Senior Developer at TechCorp (2020-2024)
- Built scalable web applications using React and Node.js
- Led a team of 5 engineers and improved performance by 40%

EDUCATION
B.S. Computer Science, State University, 2019

SKILLS
JavaScript, TypeScript, React, Node.js, SQL, Git
`;

const SAMPLE_JD = `
We are looking for a Senior Software Engineer with:
- Python and machine learning experience
- Cloud platforms (AWS, GCP)
- Microservices architecture
- React and TypeScript
- 5+ years of experience
`;

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("resume.createDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    mockInsertChain.$returningId.mockResolvedValue([{ id: 1 }]);
  });

  it("creates a draft and returns accessToken + analysisId", async () => {
    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.createDraft({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
    });

    expect(result.accessToken).toBe("test-access-token-abc123");
    expect(result.analysisId).toBe(1);
  });

  it("rejects resume text that is too short", async () => {
    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    await expect(
      caller.createDraft({
        resumeText: "too short",
        jobDescription: SAMPLE_JD,
      })
    ).rejects.toThrow();
  });

  it("rejects job description that is too short", async () => {
    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    await expect(
      caller.createDraft({
        resumeText: SAMPLE_RESUME,
        jobDescription: "short",
      })
    ).rejects.toThrow();
  });
});

describe("resume.getResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when analysis not found", async () => {
    mockSelectChain.limit.mockResolvedValue([]);

    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    await expect(caller.getResult({ accessToken: "nonexistent" })).rejects.toThrow("Analysis not found");
  });

  it("returns analysis data for valid token", async () => {
    mockSelectChain.limit.mockResolvedValue([
      {
        id: 1,
        accessToken: "valid-token",
        status: "done",
        atsScore: 78,
        scoreBreakdown: { keywordMatch: 75, experienceRelevance: 80, educationMatch: 70, structureScore: 85 },
        summary: "Good match",
        missingKeywords: ["Python"],
        suggestions: [{ section: "Skills", issue: "Missing Python", suggestion: "Add Python", priority: "high" }],
        optimizedResume: "# Optimized Resume\n...",
        createdAt: new Date(),
      },
    ]);

    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.getResult({ accessToken: "valid-token" });
    expect(result.atsScore).toBe(78);
    expect(result.status).toBe("done");
    expect(result.missingKeywords).toContain("Python");
  });
});

describe("resume.checkPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pending when no payment session exists", async () => {
    mockSelectChain.limit
      .mockResolvedValueOnce([{ id: 1, accessToken: "test-token", status: "pending" }])
      .mockResolvedValueOnce([]);

    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.checkPayment({ accessToken: "test-token" });
    expect(result.paymentStatus).toBe("pending");
    expect(result.checkoutUrl).toBeNull();
  });

  it("returns paid status when payment is confirmed", async () => {
    mockSelectChain.limit
      .mockResolvedValueOnce([{ id: 1, accessToken: "test-token", status: "processing" }])
      .mockResolvedValueOnce([{ id: 1, analysisId: 1, status: "paid", checkoutUrl: null }]);

    const { resumeRouter } = await import("./resume");
    const caller = resumeRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.checkPayment({ accessToken: "test-token" });
    expect(result.paymentStatus).toBe("paid");
  });
});
