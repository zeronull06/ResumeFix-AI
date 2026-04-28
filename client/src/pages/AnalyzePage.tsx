import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Briefcase, Sparkles, X, Loader2 } from "lucide-react";

export default function AnalyzePage() {
  const [, navigate] = useLocation();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPdf = trpc.resume.extractPdf.useMutation();
  const analyze = trpc.resume.analyze.useMutation({
    onSuccess: (data) => {
      navigate(`/results/${data.accessToken}`);
    },
    onError: (err) => {
      toast.error(err.message || "Analysis failed. Please try again.");
    },
  });

  const isLoading = extractPdf.isPending || analyze.isPending;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      try {
        const result = await extractPdf.mutateAsync({ base64, filename: file.name });
        setResumeText(result.text);
        toast.success("Resume extracted successfully");
      } catch {
        toast.error("Could not parse PDF. Please paste your resume text instead.");
        setFileName(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    if (resumeText.trim().length < 50) {
      toast.error("Please provide your resume (at least 50 characters)");
      return;
    }
    if (jobDescription.trim().length < 50) {
      toast.error("Please provide the job description (at least 50 characters)");
      return;
    }
    await analyze.mutateAsync({ resumeText: resumeText.trim(), jobDescription: jobDescription.trim() });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a7a4a] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">ResumeAI Optimizer</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyze Your Resume</h1>
          <p className="text-gray-500">Upload your resume and paste the job description to get your ATS score and optimized resume</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resume Upload */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#1a7a4a]" />
              <h2 className="font-semibold text-gray-900">Your Resume</h2>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
                isDragging ? "border-[#1a7a4a] bg-green-50" : "border-gray-200 hover:border-[#1a7a4a] hover:bg-gray-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {extractPdf.isPending ? (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1a7a4a]" />
                  <span className="text-sm">Extracting text...</span>
                </div>
              ) : fileName ? (
                <div className="flex items-center justify-center gap-2 text-[#1a7a4a]">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFileName(null); setResumeText(""); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium text-gray-600">Drop your PDF here</span>
                  <span className="text-xs text-gray-400">or click to browse</span>
                </div>
              )}
            </div>

            <div className="relative mb-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">or paste text below</span>
              </div>
            </div>

            <Textarea
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="min-h-[220px] text-sm resize-none border-gray-200 focus:border-[#1a7a4a] focus:ring-[#1a7a4a]"
            />
            <div className="mt-1 text-right text-xs text-gray-400">{resumeText.length} chars</div>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-[#1a7a4a]" />
              <h2 className="font-semibold text-gray-900">Job Description</h2>
            </div>
            <Textarea
              placeholder="Paste the target job description here to compare against your resume..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[340px] text-sm resize-none border-gray-200 focus:border-[#1a7a4a] focus:ring-[#1a7a4a]"
            />
            <div className="mt-1 text-right text-xs text-gray-400">{jobDescription.length} chars</div>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#1a7a4a] hover:bg-[#155f3a] text-white px-10 py-3 text-base font-semibold rounded-xl shadow-md transition-all"
            size="lg"
          >
            {analyze.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze My Resume
              </>
            )}
          </Button>
          {analyze.isPending && (
            <p className="text-sm text-gray-500 animate-pulse">
              GPT-4o-mini is analyzing your resume... this may take 10–20 seconds
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
