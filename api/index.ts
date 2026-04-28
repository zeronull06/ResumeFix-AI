// Vercel serverless entry point — wraps Express app for Vercel deployment
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerLemonSqueezyWebhook } from "../server/webhooks/lemonsqueezy";

const app = express();

// Webhook route: capture raw body BEFORE json parsing (needed for signature verification)
app.use("/api/lemonsqueezy/webhook", (req, _res, next) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const rawBody = Buffer.concat(chunks);
    (req as typeof req & { rawBody: Buffer }).rawBody = rawBody;
    try {
      (req as typeof req & { body: unknown }).body = JSON.parse(rawBody.toString("utf-8"));
    } catch {
      (req as typeof req & { body: unknown }).body = {};
    }
    next();
  });
  req.on("error", next);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);
registerLemonSqueezyWebhook(app);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
