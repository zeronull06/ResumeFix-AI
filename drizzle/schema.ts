import { integer, pgEnum, pgTable, serial, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const analysisStatusEnum = pgEnum("analysis_status", ["pending", "processing", "done", "failed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "refunded"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Stores each resume analysis job */
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  /** Short token for result retrieval without auth */
  accessToken: varchar("accessToken", { length: 64 }).notNull().unique(),
  resumeText: text("resumeText").notNull(),
  jobDescription: text("jobDescription").notNull(),
  atsScore: integer("atsScore"),
  scoreBreakdown: jsonb("scoreBreakdown").$type<{
    keywordMatch: number;
    experienceRelevance: number;
    educationMatch: number;
    structureScore: number;
  }>(),
  summary: text("summary"),
  missingKeywords: jsonb("missingKeywords").$type<string[]>(),
  suggestions: jsonb("suggestions").$type<{ section: string; issue: string; suggestion: string; priority: string }[]>(),
  optimizedResume: text("optimizedResume"),
  /** pending=awaiting payment, processing=AI running, done=complete, failed=error */
  status: analysisStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

/** Tracks Lemon Squeezy payment orders */
export const paymentSessions = pgTable("payment_sessions", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysisId").notNull(),
  lsOrderId: varchar("lsOrderId", { length: 128 }),
  checkoutUrl: text("checkoutUrl"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  amountCents: integer("amountCents"),
  customerEmail: varchar("customerEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PaymentSession = typeof paymentSessions.$inferSelect;
export type InsertPaymentSession = typeof paymentSessions.$inferInsert;
