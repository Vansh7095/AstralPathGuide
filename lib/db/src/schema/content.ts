import { integer, pgTable, text, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicesTable = pgTable("services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  suitableFor: text("suitable_for").notNull(),
  sessionDetails: text("session_details").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  priceInr: numeric("price_inr", { precision: 10, scale: 2 }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
});

export const faqsTable = pgTable("faqs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
});

export const practiceSettingsTable = pgTable("practice_settings", {
  id: integer("id").primaryKey().default(1),
  workingDays: integer("working_days").array().notNull().default([1, 2, 3, 4, 5]),
  workingStart: text("working_start").notNull().default("10:00"),
  workingEnd: text("working_end").notNull().default("17:00"),
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
  unavailableDates: jsonb("unavailable_dates").$type<string[]>().notNull().default([]),
  sessionDurationMinutes: integer("session_duration_minutes").notNull().default(60),
});

export const insertServiceSchema = createInsertSchema(servicesTable);
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;

export const insertFaqSchema = createInsertSchema(faqsTable);
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqsTable.$inferSelect;
export type PracticeSettings = typeof practiceSettingsTable.$inferSelect;