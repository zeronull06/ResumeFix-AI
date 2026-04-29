import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download, Copy, ArrowLeft, Sparkles, CheckCircle,
  AlertCircle, TrendingUp, Loader2, RefreshCw,
} from "lucide-react";

// PDF Download via browser print
async function downloadAsPdf(markdownContent: string) {
  const { marked } = await import("marked");
  const html = await marked(markdownContent);
  const printWindow = window.open("", "_blank");
  if (!printWindow) { toast.error("Please allow popups to download PDF"); return; }
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Optimized Resume</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;font-size:11pt;line-height:1.55;color:#1a1a1a;padding:2.5cm;max-width:21cm;margin:0 auto}
h1{font-size:20pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4pt}
h2{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-bottom:1.5px solid #1a7a4a;padding-bottom:3pt;margin-top:14pt;margin-bottom:6pt}
h3{font-size:11pt;font-weight:700;margin-top:8pt;margin-bottom:2pt}
p{margin-bottom:5pt;color:#333}ul{padding-left:16pt;margin-bottom:6pt}li{margin-bottom:3pt;color:#333}
strong{font-weight:700}@media print{body{padding:0}@page{margin:2cm}}</style></head>
<body>${html}<script>window.onload=function(){setTimeout(function(){window.print();window.close();},300);}\x3c/script></body></html>`);
  printWindow.document.close();
}

// Score Circle
function ScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#1a7a4a" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "High Match" : score >= 60 ? "Moderate Match" : "Low Match";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}%</span>
          <span className="text-xs text-gray-500 font-medium">ATS SCORE</span>
        </div>
      </div>
      <span className="text-xs font-semibold px-3 py-1 rounded-full border"
        style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}>
        {label}
      </span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#1a7a4a" : value >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span><span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Safe resume preview using innerHTML to avoid React insertBefore error
function ResumePreview({ markdown, keywords }: { markdown: string; keywords: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const highlight = (text: string) => {
      if (!keywords.length) return text;
      const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return text.replace(
        new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"),
        `<mark style="background:#1a7a4a20;color:#1a7a4a;padding:0 2px;border-radius:3px;font-weight:600">$1</mark>`
      );
    };

    const renderInline = (text: string) =>
      text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");

    const lines = markdown.split("\n");
    const html = lines.map((line) => {
      if (line.startsWith("# ")) {
        return `<h1 style="font-size:1.2rem;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${highlight(renderInline(line.slice(2)))}</h1>`;
      }
      if (line.startsWith("## ")) {
        return `<h2 style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1.5px solid #1a7a4a;padding-bottom:3px;margin-top:16px;margin-bottom:8px;color:#111">${highlight(renderInline(line.slice(3)))}</h2>`;
      }
      if (line.startsWith("### ")) {
        return `<h3 style="font-weight:700;font-size:0.85rem;margin-top:8px;margin-bottom:2px;color:#111">${highlight(renderInline(line.slice(4)))}</h3>`;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<div style="display:flex;gap:8px;margin-left:16px;margin-bottom:2px"><span style="color:#aaa;flex-shrink:0;margin-top:2px">\u2022</span><p style="font-size:0.75rem;color:#444;line-height:1.5;margin:0">${highlight(renderInline(line.slice(2)))}</p></div>`;
      }
      if (line.trim() === "") {
        return `<div style="height:4px"></div>`;
      }
      return `<p style="font-size:0.75rem;color:#444;line-height:1.5;margin-bottom:2px">${highlight(renderInline(line))}</p>`;
    }).join("");

    containerRef.current.innerHTML = html;
  }, [markdown, keywords]);

  return <div ref={containerRef} className="font-serif text-gray-800 leading-relaxed" />;
}

// Main Page
export default function ResultsPage() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [, navigate] = useLocation();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.resume.getResult.useQuery(
    { accessToken: accessToken ?? "" },
    { enabled: !!accessToken, retry: 2 }
  );

  const analyze = trpc.resume.analyze.useMutation({
    onSuccess: () => {
      void utils.resume.getResult.invalidate({ accessToken: accessToken ?? "" });
      setIsAnalyzing(false);
    },
    onError: (err) => {
      toast.error(err.message || "Analysis failed. Please try again.");
      setIsAnalyzing(false);
    },
  });

  // Auto-trigger analysis: free analysis (no payment) or after payment confirmed
  useEffect(() => {
    if (!data || analyze.isPending || isAnalyzing) return;
    
    // Check if payment was successful
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get("payment") === "success";
    
    // Trigger analysis if: (1) free analysis (no payment needed), OR (2) payment confirmed
    if ((data.status === "pending" || data.status === "failed") && !isAnalyzing) {
      setIsAnalyzing(true);
      analyze.mutate({ accessToken: accessToken ?? "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, accessToken])

  const handleCopy = () => {
    if (!data?.optimizedResume) return;
    navigator.clipboard.writeText(data.optimizedResume as string);
    toast.success("Copied to clipboard!");
  };

  const handleDownloadPdf = async () => {
    if (!data?.optimizedResume) return;
    setIsPdfLoading(true);
    try { await downloadAsPdf(data.optimizedResume as string); }
    catch { toast.error("Failed to generate PDF"); }
    finally { setIsPdfLoading(false); }
  };

  if (isLoading || isAnalyzing || (data && data.status === "processing")) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1a7a4a] mx-auto" />
        <p className="text-gray-600 font-medium">
          {isAnalyzing || (data && data.status === "processing")
            ? "AI is analyzing your resume... this may take 20\u201330 seconds"
            : "Loading your results..."}
        </p>
        {(isAnalyzing || (data && data.status === "processing")) && (
          <p className="text-xs text-gray-400">Please wait, do not close this page</p>
        )}
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Results Not Found</h2>
        <p className="text-gray-500 text-sm">This analysis may have expired or the link is invalid.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-[#1a7a4a] hover:bg-[#155f3a] text-white">
          Start New Analysis
        </Button>
      </div>
    </div>
  );

  if (data.status === "failed") return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Analysis Failed</h2>
        <p className="text-gray-500 text-sm">Something went wrong during AI processing. Please try again.</p>
        <Button onClick={() => navigate("/analyze")} className="bg-[#1a7a4a] hover:bg-[#155f3a] text-white">
          Try Again
        </Button>
      </div>
    </div>
  );

  const scoreBreakdown = data.scoreBreakdown as { keywordMatch: number; experienceRelevance: number; educationMatch: number; structureScore: number } | null;
  const missingKeywords = (data.missingKeywords as string[]) ?? [];
  const suggestions = (data.suggestions as { section: string; issue: string; suggestion: string; priority: string }[]) ?? [];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/analyze")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> New Analysis
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1a7a4a] rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">ResumeAI Optimizer</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs border-gray-200">
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Markdown
            </Button>
            <Button size="sm" onClick={handleDownloadPdf} disabled={isPdfLoading} className="bg-[#1a7a4a] hover:bg-[#155f3a] text-white text-xs">
              {isPdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Panel: Scores */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1a7a4a]" /> ATS Compatibility
              </h2>
              <div className="flex justify-center mb-4">
                <ScoreCircle score={data.atsScore ?? 0} />
              </div>
              {data.summary && <p className="text-sm text-gray-600 text-center leading-relaxed">{data.summary as string}</p>}
            </div>
            {scoreBreakdown && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Score Breakdown</h3>
                <div className="space-y-3">
                  <ScoreBar label="Keyword Match" value={scoreBreakdown.keywordMatch} />
                  <ScoreBar label="Experience Relevance" value={scoreBreakdown.experienceRelevance} />
                  <ScoreBar label="Education Match" value={scoreBreakdown.educationMatch} />
                  <ScoreBar label="Structure & Format" value={scoreBreakdown.structureScore} />
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Post-Optimization Details</h3>
              {missingKeywords.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Missing Keywords Added</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: "#1a7a4a15", color: "#1a7a4a", border: "1px solid #1a7a4a30" }}>
                        {kw} <CheckCircle className="w-3 h-3" />
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Structural Tips Applied</p>
                  <div className="space-y-2">
                    {suggestions.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#1a7a4a] mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-600 leading-relaxed">{s.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full border-gray-200 text-gray-600 hover:text-gray-900 text-sm" onClick={() => navigate("/analyze")}>
              <RefreshCw className="w-4 h-4 mr-2" /> Analyze Another Resume
            </Button>
          </div>

          {/* Right Panel: Optimized Resume */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Your Optimized Resume</h2>
                <p className="text-xs text-gray-500 mt-0.5">Ready for download and application</p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs border-gray-200">
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Markdown
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} disabled={isPdfLoading} className="bg-[#1a7a4a] hover:bg-[#155f3a] text-white text-xs">
                  {isPdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  Download PDF
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
              <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-inner min-h-[600px]">
                {data.optimizedResume ? (
                  <ResumePreview markdown={data.optimizedResume as string} keywords={missingKeywords} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>No optimized resume generated</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
