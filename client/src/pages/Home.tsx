import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Globe,
  FileText,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "ATS Score Analysis",
    desc: "Get an instant compatibility score showing exactly how well your resume matches the job description.",
  },
  {
    icon: Zap,
    title: "Missing Keywords",
    desc: "Identify every critical keyword and skill from the job posting that's absent from your resume.",
  },
  {
    icon: TrendingUp,
    title: "Section-by-Section Tips",
    desc: "Receive targeted, actionable suggestions for each part of your resume — summary, experience, skills.",
  },
  {
    icon: Sparkles,
    title: "AI-Optimized Resume",
    desc: "Get a fully rewritten version of your resume tailored to pass ATS filters and impress hiring managers.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Upload Your Resume", desc: "Drop your PDF or paste your resume text directly." },
  { step: "02", title: "Paste the Job Description", desc: "Copy the full JD from any job board." },
  { step: "03", title: "Pay Once — $6.99", desc: "Secure one-time payment. No subscription. No account required." },
  { step: "04", title: "Download & Apply", desc: "Copy your optimized resume and apply with confidence." },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <header className="glass fixed w-full top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="text-xl font-extrabold text-primary tracking-tighter"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            ResumeFix AI
          </div>
          <nav className="hidden md:flex gap-8">
            {["Features", "How It Works", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-muted-foreground hover:text-secondary transition-colors text-sm font-medium"
              >
                {item}
              </a>
            ))}
          </nav>
          <Button
            onClick={() => navigate("/analyze")}
            className="bg-secondary text-secondary-foreground hover:opacity-90 font-semibold px-6"
          >
            Get Started
          </Button>
        </div>
      </header>

      <main className="pt-20">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent text-accent-foreground rounded-full mb-6 text-xs font-semibold tracking-wide uppercase">
              <CheckCircle className="w-3.5 h-3.5" />
              AI-Powered Optimization
            </div>

            <h1
              className="text-5xl md:text-6xl font-extrabold text-primary mb-6 max-w-3xl mx-auto leading-tight tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Stop getting{" "}
              <span className="text-gradient-green">ghosted by ATS.</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload your resume and paste a job description. Get an instant ATS
              score, missing keywords, and a perfectly optimized resume in under
              20 seconds.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button
                onClick={() => navigate("/analyze")}
                size="lg"
                className="bg-secondary text-secondary-foreground hover:opacity-90 font-semibold px-8 py-6 text-base shadow-lg hover:scale-[1.02] transition-transform"
              >
                <Zap className="w-4 h-4 mr-2" />
                Analyze My Resume — $6.99
              </Button>
              <div className="flex items-center gap-2 justify-center py-3 px-5 bg-muted rounded-xl text-sm font-semibold text-muted-foreground">
                <Clock className="w-4 h-4 text-secondary" />
                Processed in 20s
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              {[
                { icon: Shield, text: "No account required" },
                { icon: Globe, text: "Works worldwide" },
                { icon: CheckCircle, text: "One-time payment" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-secondary" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Demo Preview Card ──────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl card-shadow-lg overflow-hidden"
          >
            {/* Window chrome */}
            <div className="bg-muted px-4 py-3 flex items-center gap-2 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-chart-5/60" />
              <div className="w-3 h-3 rounded-full bg-secondary/60" />
              <span className="ml-2 text-xs text-muted-foreground font-medium">ResumeFix AI — Analysis Result</span>
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-6">
              {/* Score */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.93 0.003 240)" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="oklch(0.48 0.16 155)" strokeWidth="10"
                      strokeDasharray={`${2 * Math.PI * 40 * 0.87} ${2 * Math.PI * 40 * 0.13}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-primary" style={{ fontFamily: "'Manrope', sans-serif" }}>87</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">ATS Score</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary mt-3">Strong Match</p>
                <p className="text-xs text-muted-foreground text-center mt-1">Resume is missing 3 critical keywords</p>
              </div>
              {/* Keywords */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Python", "Agile", "SQL", "CI/CD"].map((kw) => (
                    <span key={kw} className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium flex items-center gap-1">
                      ✕ {kw}
                    </span>
                  ))}
                </div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Structural Tips</h4>
                <ul className="space-y-2">
                  {[
                    "Convert 2-column to single column for ATS",
                    "Quantify bullets in Experience section",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Optimized resume snippet */}
              <div className="bg-muted rounded-xl p-3 font-mono text-xs text-foreground leading-relaxed overflow-hidden border border-border">
                <div className="text-secondary font-bold mb-1"># Professional Experience</div>
                <div className="text-muted-foreground">**Senior Engineer | TechCorp**</div>
                <div className="text-muted-foreground">*Jan 2021 – Present*</div>
                <div className="mt-1 text-foreground">- Developed <span className="text-secondary font-semibold">Python</span>-based microservices, reducing latency by 40%.</div>
                <div className="text-foreground">- Led teams using <span className="text-secondary font-semibold">Agile</span> to deliver 12 features.</div>
                <div className="text-foreground">- Optimized <span className="text-secondary font-semibold">SQL</span> queries improving speed by 25%.</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="bg-muted py-20 mb-0">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2
                className="text-4xl font-bold text-primary mb-4 tracking-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Everything you need to land the interview
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                One payment. Full analysis. No subscriptions, no accounts, no friction.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 card-shadow hover:border-secondary/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="font-bold text-primary mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2
              className="text-4xl font-bold text-primary mb-4 tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              How it works
            </h2>
            <p className="text-muted-foreground">Four steps from resume to optimized in under a minute.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div
                  className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-extrabold shadow-lg"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {step.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-px bg-border" />
                )}
                <h3 className="font-bold text-primary mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section id="pricing" className="bg-muted py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2
                className="text-4xl font-bold text-primary mb-4 tracking-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground">Pay once. Get everything. No subscriptions.</p>
            </div>

            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-primary rounded-2xl p-8 text-center card-shadow-lg relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-secondary rounded-b-full" />

                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary rounded-full mb-6 text-xs font-semibold tracking-wide uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  Full Analysis
                </div>

                <div className="mb-6">
                  <span
                    className="text-6xl font-extrabold text-white"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    $6.99
                  </span>
                  <span className="text-white/60 ml-2 text-sm">one-time</span>
                </div>

                <ul className="space-y-3 mb-8 text-left">
                  {[
                    "ATS compatibility score (0–100)",
                    "Score breakdown by category",
                    "Missing keywords & skills list",
                    "Section-by-section suggestions",
                    "Fully rewritten optimized resume",
                    "Copy & download as Markdown",
                    "No account required",
                    "Results in under 20 seconds",
                    "Powered by GPT-4o",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                      <CheckCircle className="w-4 h-4 text-secondary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/analyze")}
                  size="lg"
                  className="w-full bg-secondary text-secondary-foreground hover:opacity-90 font-bold text-base py-6"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze My Resume — $6.99
                </Button>

                <p className="text-white/40 text-xs mt-4">
                  Secure payment via Lemon Squeezy · Works worldwide · Tax handled automatically
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-4xl font-extrabold text-primary mb-4 tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Your next job starts with a better resume.
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Stop guessing what recruiters want. Let AI show you exactly what's missing.
            </p>
            <Button
              onClick={() => navigate("/analyze")}
              size="lg"
              className="bg-secondary text-secondary-foreground hover:opacity-90 font-bold px-10 py-6 text-base shadow-lg hover:scale-[1.02] transition-transform"
            >
              Get Full Analysis — $6.99
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-muted-foreground text-xs mt-4">
              No account required · Processed in 20 seconds · Secure payment
            </p>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-primary text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div
              className="text-lg font-extrabold tracking-tighter mb-1"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              ResumeFix AI
            </div>
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} ResumeFix AI. No account required. Instant results.
            </p>
          </div>
          <div className="flex gap-8">
            {["Privacy Policy", "Terms of Service", "Support"].map((link) => (
              <a key={link} href="#" className="text-xs text-white/50 hover:text-secondary transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
