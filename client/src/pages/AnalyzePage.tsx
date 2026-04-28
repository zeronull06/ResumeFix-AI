import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  Zap,
  ArrowLeft,
  Loader2,
  CheckCircle,
  X,
  Shield,
  Lock,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AnalyzePage() {
  const [, navigate] = useLocation();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDraftMutation = trpc.resume.createDraft.useMutation();
  const createCheckoutMutation = trpc.payment.createCheckout.useMutation();

  const extractPdfMutation = trpc.resume.extractPdf.useMutation({
    onSuccess: (data) => {
      setResumeText(data.text);
      toast.success("PDF text extracted successfully");
    },
    onError: () => {
      toast.error("Failed to extract PDF. Please paste your resume manually.");
    },
  });

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        extractPdfMutation.mutate({ base64, filename: file.name });
      };
      reader.readAsDataURL(file);
    },
    [extractPdfMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleAnalyze = async () => {
    const finalResume = resumeText.trim();
    const finalJD = jobDescription.trim();

    if (!finalResume || finalResume.length < 50) {
      toast.error("Please provide your resume (at least 50 characters)");
      return;
    }
    if (!finalJD || finalJD.length < 50) {
      toast.error("Please paste the job description (at least 50 characters)");
      return;
    }

    try {
      setIsRedirecting(true);
      toast.info("Creating your analysis draft...");

      // Step 1: Save draft to DB
      const draft = await createDraftMutation.mutateAsync({
        resumeText: finalResume,
        jobDescription: finalJD,
      });

      // Step 2: Create Lemon Squeezy checkout
      const checkout = await createCheckoutMutation.mutateAsync({
        accessToken: draft.accessToken,
        origin: window.location.origin,
      });

      if (checkout.alreadyPaid) {
        // Already paid — go straight to results
        navigate(`/results/${draft.accessToken}`);
        return;
      }

      if (!checkout.checkoutUrl) {
        throw new Error("Failed to create checkout session");
      }

      // Step 3: Redirect to Lemon Squeezy checkout
      toast.success("Redirecting to secure checkout...");
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setIsRedirecting(false);
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  };

  const isLoading = createDraftMutation.isPending || createCheckoutMutation.isPending || extractPdfMutation.isPending || isRedirecting;
  const canSubmit = resumeText.trim().length > 50 && jobDescription.trim().length > 50 && !isLoading;

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div
            className="text-lg font-extrabold text-primary tracking-tighter"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            ResumeFix AI
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-secondary" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Title */}
          <div className="text-center mb-10">
            <h1
              className="text-4xl font-extrabold text-primary mb-3 tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Analyze Your{" "}
              <span className="text-gradient-green">Resume</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Upload your resume and paste the job description. Pay once ($6.99) and get your full ATS analysis + optimized resume in seconds.
            </p>
          </div>

          {/* What you get banner */}
          <div className="bg-accent border border-secondary/20 rounded-xl p-4 mb-8 flex flex-wrap justify-center gap-4 text-sm">
            {[
              "ATS Score (0–100)",
              "Missing Keywords",
              "Section Suggestions",
              "Rewritten Resume",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-accent-foreground font-medium">
                <CheckCircle className="w-4 h-4 text-secondary" />
                {item}
              </div>
            ))}
            <div className="flex items-center gap-1.5 font-bold text-secondary">
              <Zap className="w-4 h-4" />
              $6.99 one-time
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Resume Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary" />
                  Your Resume
                </label>
                {uploadedFile && (
                  <button
                    onClick={() => { setUploadedFile(null); setResumeText(""); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="w-full bg-muted border border-border">
                  <TabsTrigger value="upload" className="flex-1 text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload PDF
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex-1 text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Paste Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-secondary bg-accent"
                        : uploadedFile
                        ? "border-secondary/50 bg-accent/30"
                        : "border-border hover:border-secondary/50 hover:bg-accent/20"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                    />
                    {extractPdfMutation.isPending ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                        <p className="text-sm text-muted-foreground">Extracting text...</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-secondary" />
                        <p className="text-sm font-semibold text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {resumeText ? `${resumeText.length} characters extracted` : "Processing..."}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Drop your PDF here</p>
                          <p className="text-xs text-muted-foreground mt-1">or click to browse · Max 5MB</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-1">Browse Files</Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-3">
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume text here..."
                    className="min-h-[280px] resize-none text-sm bg-card border-border focus:border-secondary"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {resumeText.length} characters
                    {resumeText.length < 50 && resumeText.length > 0 && (
                      <span className="text-destructive ml-1">— need at least 50</span>
                    )}
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Job Description */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-secondary" />
                Job Description
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here to compare against your resume..."
                className="min-h-[320px] resize-none text-sm bg-card border-border focus:border-secondary"
              />
              <p className="text-xs text-muted-foreground">
                {jobDescription.length} characters
                {jobDescription.length < 50 && jobDescription.length > 0 && (
                  <span className="text-destructive ml-1">— need at least 50</span>
                )}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={!canSubmit}
              size="lg"
              className="bg-secondary text-secondary-foreground hover:opacity-90 font-bold px-12 py-6 text-base shadow-lg disabled:opacity-50 hover:scale-[1.02] transition-transform"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRedirecting ? "Redirecting to checkout..." : "Preparing..."}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze & Pay — $6.99
                </>
              )}
            </Button>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-secondary" />
                Secure payment via Lemon Squeezy
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-secondary" />
                Tax handled automatically worldwide
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-secondary" />
                No account required
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
