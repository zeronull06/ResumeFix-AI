# ResumeFix AI - Project TODO

## Phase 1: Schema & Database
- [x] Create todo.md
- [x] Add `analyses` table to drizzle/schema.ts
- [x] Run migration and apply SQL

## Phase 2: Landing Page
- [x] Design elegant color palette and typography in index.css
- [x] Build hero section with headline, subheadline, CTA
- [x] Build features section (3 key benefits)
- [x] Build pricing tier section (Free vs Paid)
- [x] Build footer

## Phase 3: Resume Upload Form
- [x] Create AnalyzePage with resume upload (PDF + text paste)
- [x] Add Job Description textarea
- [x] Add file parsing (PDF → text via server)
- [x] Add form validation
- [x] Register route in App.tsx

## Phase 4: Backend AI Analysis API
- [x] Create tRPC procedure `resume.analyze` (public - returns ATS score only for free)
- [x] Create tRPC procedure `resume.analyzeFullPaid` (protected - returns full analysis)
- [x] Implement AI prompt for ATS scoring (0-100)
- [x] Implement AI prompt for missing keywords extraction
- [x] Implement AI prompt for improvement suggestions
- [x] Implement AI prompt for optimized resume rewrite
- [x] Add PDF text extraction endpoint

## Phase 5: Results Display Page
- [x] Create ResultsPage with ATS score gauge/circle
- [x] Display missing keywords as tags
- [x] Display improvement suggestions per section
- [x] Display optimized resume (Paid only, locked for Free)
- [x] Add upgrade CTA for Free users
- [x] Add copy/download button for optimized resume

## Phase 6: Testing & Delivery
- [x] Write vitest tests for AI analysis procedures
- [x] Test Free tier flow end-to-end
- [x] Test Paid tier flow end-to-end
- [x] Save checkpoint
- [x] Deliver to user

## Phase 7: ResuMax Design Redesign + Stripe Integration
- [x] Answer user questions about AI API and payment system
- [x] Add Stripe integration via webdev_add_feature (superseded by Lemon Squeezy)
- [x] Redesign UI to match ResuMax AI (light theme, Manrope+Inter, green accent)
- [x] Remove free tier - all analysis requires payment
- [x] Create Stripe Checkout session endpoint (superseded by Lemon Squeezy)
- [x] Create Stripe webhook for payment confirmation (superseded by Lemon Squeezy)
- [x] Add payment_sessions table to track paid analyses
- [x] Update analyze flow: upload → pay → get full results
- [x] Update Home.tsx with ResuMax design (light, clean, green CTA)
- [x] Update AnalyzePage.tsx with ResuMax design
- [x] Update ResultsPage.tsx - remove free/paid gating, show all results
- [x] Write tests for Stripe payment flow (superseded by Lemon Squeezy tests)
- [x] Save checkpoint

## Phase 8: OpenAI GPT + Lemon Squeezy Integration
- [x] Add OPENAI_API_KEY secret
- [x] Add LEMONSQUEEZY_API_KEY, STORE_ID, VARIANT_ID, WEBHOOK_SECRET secrets
- [x] Install openai npm package
- [x] Replace invokeLLM with OpenAI GPT-4o calls in resume router
- [x] Create Lemon Squeezy checkout session endpoint
- [x] Create Lemon Squeezy webhook handler (/api/lemonsqueezy/webhook)
- [x] Add payment_sessions table to track paid analyses
- [x] Update analyze flow: upload resume+JD → save draft → pay via LS → webhook confirms → run AI → show results
- [x] Redesign Home.tsx with ResuMax AI style (light, Manrope, green, $6.99)
- [x] Redesign AnalyzePage.tsx with ResuMax style
- [x] Update ResultsPage.tsx - remove all free/paid gating, always show full results
- [x] Write tests for new payment flow
- [x] Save checkpoint
