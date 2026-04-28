import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  Clock,
  RefreshCw,
} from "lucide-react";

// ─── Score helpers ────────────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 80) return "oklch(0.48 0.16 155)";
  if (score >= 60) return "oklch(0.60 0.14 155)";
  if (score >= 40) return "oklch(0.65 0.16 75)";
  return "oklch(0.50 0.20 25)";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Moderate Match";
  if (score >= 40) return "Weak Match";
  return "Poor Match";
}

function getScoreTextClass(score: number) {
  if (score >= 80) return "score-excellent";
  if (score >= 60) return "score-good";
  if (score >= 40) return "score-average";
  return "score-poor";
}

function getPriorityClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "high": return "bg-destructive/10 text-destructive";
    case "medium": return "bg-chart-5/10 text-chart-5";
    default: return "bg-secondary/10 text-secondary";
  }
}

// ─── Score Gauge ─────────────────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="oklch(0.93 0.003 240)" strokeWidth="12" />
        <motion.circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={getScoreColor(score)} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${filled} ${circumference - filled}` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-4xl font-extrabold ${getScoreTextClass(score)}`}
          style={{ fontFamily: "'Manrope', sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">ATS Score</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultsPage() {
  const params = useParams<{ accessToken: string }>();
  const accessToken = params.accessToken;
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const runAnalysisMutation = trpc.resume.runAnalysis.useMutation();

  const { data: result, refetch: refetchResult } = trpc.resume.getResult.useQuery(
    { accessToken: accessToken ?? "" },
    { enabled: !!accessToken, refetchInterval: pollingEnabled ? 3000 : false }
  );

  const { data: paymentData, refetch: refetchPayment } = trpc.resume.checkPayment.useQuery(
    { accessToken: accessToken ?? "" },
    { enabled: !!accessToken, refetchInterval: pollingEnabled ? 3000 : false }
  );

  useEffect(() => {
    if (!paymentData || !result) return;

    if (paymentData.paymentStatus === "paid" && result.status === "pending") {
      runAnalysisMutation.mutate(
        { accessToken: accessToken ?? "" },
        {
          onSuccess: () => void refetchResult(),
          onError: (err) => toast.error(err.message),
        }
      );
    }

    if (result.status === "done" || result.status === "failed") {
      setPollingEnabled(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData?.paymentStatus, result?.status]);

  const handleCopy = () => {
    if (!result?.optimizedResume) return;
    void navigator.clipboard.writeText(result.optimizedResume);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.optimizedResume) return;
    const blob = new Blob([result.optimizedResume], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized-resume.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as Markdown");
  };

  // Loading
  if (!result || !paymentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-secondary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading your analysis...</p>
        </div>
      </div>
    );
  }

  // Waiting for payment
  if (paymentData.paymentStatus !== "paid") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-10 max-w-md w-full text-center card-shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Waiting for payment
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Complete your payment to unlock the full analysis. This page will update automatically.
          </p>
          <div className="flex gap-3 justify-center">
            {paymentData.checkoutUrl && (
              <Button
                onClick={() => { window.location.href = paymentData.checkoutUrl!; }}
                className="bg-secondary text-secondary-foreground hover:opacity-90 font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Complete Payment — $6.99
              </Button>
            )}
            <Button variant="outline" onClick={() => { void refetchPayment(); void refetchResult(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Already paid? Click Refresh or wait a few seconds.</p>
        </motion.div>
      </div>
    );
  }

  // Processing
  if (result.status === "processing" || result.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-10 max-w-md w-full text-center card-shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-secondary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>
            AI is analyzing your resume
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            GPT-4o is reading your resume and job description. This usually takes 15–30 seconds.
          </p>
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-16 rounded-full bg-secondary/20"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
          </div>
          <Loader2 className="w-6 h-6 text-secondary animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  // Failed
  if (result.status === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-card border border-destructive/30 rounded-2xl p-10 max-w-md w-full text-center card-shadow">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Analysis failed
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Something went wrong. Please contact support with your token below.
          </p>
          <p className="text-xs font-mono bg-muted p-2 rounded text-muted-foreground mb-6 break-all">{accessToken}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const { atsScore, scoreBreakdown, summary, missingKeywords, suggestions, optimizedResume } = result;

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="glass border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">New Analysis</span>
          </button>
          <div className="text-lg font-extrabold text-primary tracking-tighter" style={{ fontFamily: "'Manrope', sans-serif" }}>
            ResumeFix AI
          </div>
          <div className="flex items-center gap-1.5 text-xs text-secondary font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Analysis Complete
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Score row */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-card border border-border rounded-2xl p-6 text-center card-shadow">
                <ScoreGauge score={atsScore ?? 0} />
                <h3
                  className={`text-lg font-bold mt-4 ${getScoreTextClass(atsScore ?? 0)}`}
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {getScoreLabel(atsScore ?? 0)}
                </h3>
                {summary && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{summary}</p>}
              </div>

              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 card-shadow">
                <h3 className="text-sm font-bold text-primary mb-5 flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  <Target className="w-4 h-4 text-secondary" />
                  Score Breakdown
                </h3>
                <div className="space-y-4">
                  {scoreBreakdown && Object.entries({
                    "Keyword Match": scoreBreakdown.keywordMatch,
                    "Experience Relevance": scoreBreakdown.experienceRelevance,
                    "Education Match": scoreBreakdown.educationMatch,
                    "Structure & Format": scoreBreakdown.structureScore,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className={`font-bold ${getScoreTextClass(value)}`}>{value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: getScoreColor(value) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="keywords" className="w-full">
              <TabsList className="bg-muted border border-border mb-6 w-full sm:w-auto">
                <TabsTrigger value="keywords" className="text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Missing Keywords
                  {missingKeywords && (
                    <span className="ml-1 px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-full text-[10px] font-bold">
                      {missingKeywords.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="text-xs flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Suggestions
                  {suggestions && (
                    <span className="ml-1 px-1.5 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold">
                      {suggestions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="optimized" className="text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Optimized Resume
                </TabsTrigger>
              </TabsList>

              <TabsContent value="keywords">
                <div className="bg-card border border-border rounded-2xl p-6 card-shadow">
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    <Zap className="w-4 h-4 text-secondary" />
                    Missing Keywords & Skills
                  </h3>
                  {missingKeywords && missingKeywords.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-4">
                        These {missingKeywords.length} keywords appear in the job description but are missing from your resume.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {missingKeywords.map((kw) => (
                          <motion.span
                            key={kw}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium border border-destructive/20 flex items-center gap-1.5"
                          >
                            <span className="text-xs">✕</span>
                            {kw}
                          </motion.span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-10 h-10 text-secondary mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">Great keyword coverage!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="suggestions">
                <div className="bg-card border border-border rounded-2xl p-6 card-shadow">
                  <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    Improvement Suggestions
                  </h3>
                  {suggestions && suggestions.length > 0 ? (
                    <div className="space-y-4">
                      {suggestions.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="border border-border rounded-xl p-4 hover:border-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-secondary bg-accent px-2 py-0.5 rounded-full">
                              {s.section}
                            </span>
                            {"priority" in s && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${getPriorityClass((s as { priority: string }).priority)}`}>
                                {(s as { priority: string }).priority}
                              </span>
                            )}
                          </div>
                          {"issue" in s && (s as { issue: string }).issue && (
                            <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-destructive" />
                              {(s as { issue: string }).issue}
                            </p>
                          )}
                          <p className="text-sm text-foreground flex items-start gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-secondary" />
                            {s.suggestion}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-10 h-10 text-secondary mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">Your resume looks solid!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="optimized">
                <div className="bg-card border border-border rounded-2xl p-6 card-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      <Sparkles className="w-4 h-4 text-secondary" />
                      AI-Optimized Resume
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs" disabled={!optimizedResume}>
                        {copied ? (
                          <><CheckCircle className="w-3.5 h-3.5 mr-1.5 text-secondary" />Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy Markdown</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs" disabled={!optimizedResume}>
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {optimizedResume ? (
                    <div className="bg-muted rounded-xl p-5 border border-border max-h-[600px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-foreground">
                        <Streamdown>{optimizedResume}</Streamdown>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-secondary animate-spin mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Generating optimized resume...</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">Want to analyze another resume?</p>
              <Button
                onClick={() => navigate("/analyze")}
                className="bg-secondary text-secondary-foreground hover:opacity-90 font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                New Analysis — $6.99
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
