import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  accountType: text("account_type"),
  onboardingStatus: text("onboarding_status").notNull().default("not_started"),
  fullName: text("full_name"),
  preferredName: text("preferred_name"),
  phone: text("phone"),
  dateOfBirth: text("date_of_birth"),
  preferredContactMethod: text("preferred_contact_method"),
  location: text("location"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  counsellingReason: text("counselling_reason"),
  preferredFormat: text("preferred_format"),
  preferredLanguage: text("preferred_language"),
  accessibilityRequirements: text("accessibility_requirements"),
  counsellingGoals: text("counselling_goals"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const staffRequestsTable = pgTable("staff_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  requestedRole: text("requested_role").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  fullName: text("full_name").notNull(),
  professionalRole: text("professional_role").notNull(),
  phone: text("phone").notNull(),
  professionalEmail: text("professional_email"),
  qualification: text("qualification").notNull(),
  experienceYears: integer("experience_years"),
  expertise: text("expertise").notNull(),
  languagesSpoken: text("languages_spoken").notNull(),
  availabilityPreferences: text("availability_preferences"),
  rejectionReason: text("rejection_reason"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedByClerkUserId: text("verified_by_clerk_user_id"),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable);
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
export const insertStaffRequestSchema = createInsertSchema(staffRequestsTable);
export type InsertStaffRequest = z.infer<typeof insertStaffRequestSchema>;
export type StaffRequest = typeof staffRequestsTable.$inferSelect;