import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateStaffRequestBody,
  CreateStaffRequestResponse,
  GetAdminStaffRequestsResponse,
  GetMyAppointmentsResponse,
  GetMyProfileResponse,
  UpdateAdminStaffRequestBody,
  UpdateAdminStaffRequestResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
} from "@workspace/api-zod";
import {
  appointmentsTable,
  db,
  servicesTable,
  staffRequestsTable,
  userProfilesTable,
} from "@workspace/db";
import { getUserId, isConfiguredAdmin, requireAdmin, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type VerificationStatus = "pending" | "verified" | "rejected";
type AccountRole = "client" | "staff" | "admin";

function asVerificationStatus(value: string | null | undefined): VerificationStatus | null {
  return value === "pending" || value === "verified" || value === "rejected" ? value : null;
}

function asAccountRole(value: string): AccountRole {
  return value === "staff" || value === "admin" ? value : "client";
}

function profileResponse(
  profile: typeof userProfilesTable.$inferSelect | undefined,
  staffRequest: typeof staffRequestsTable.$inferSelect | undefined,
  userId: string,
) {
  const accountType = profile?.accountType === "client" || profile?.accountType === "staff" || profile?.accountType === "admin"
    ? profile.accountType
    : null;
  const admin = isConfiguredAdmin(userId);
  const verifiedRequestedRole = staffRequest?.verificationStatus === "verified" ? asAccountRole(staffRequest.requestedRole) : null;
  const role: AccountRole = admin ? "admin" : verifiedRequestedRole === "staff" ? "staff" : "client";
  const verificationStatus = asVerificationStatus(staffRequest?.verificationStatus) ?? (accountType === "client" && profile?.onboardingStatus === "complete" ? "verified" : null);

  return {
    accountType,
    role,
    onboardingStatus: profile?.onboardingStatus === "complete" || profile?.onboardingStatus === "in_progress" ? profile.onboardingStatus : "not_started",
    verificationStatus,
    fullName: profile?.fullName ?? null,
    preferredName: profile?.preferredName ?? null,
    phone: profile?.phone ?? null,
    dateOfBirth: profile?.dateOfBirth ?? null,
    preferredContactMethod: profile?.preferredContactMethod ?? null,
    location: profile?.location ?? null,
    emergencyContactName: profile?.emergencyContactName ?? null,
    emergencyContactPhone: profile?.emergencyContactPhone ?? null,
    counsellingReason: profile?.counsellingReason ?? null,
    preferredFormat: profile?.preferredFormat ?? null,
    preferredLanguage: profile?.preferredLanguage ?? null,
    accessibilityRequirements: profile?.accessibilityRequirements ?? null,
    counsellingGoals: profile?.counsellingGoals ?? null,
  };
}

function staffRequestResponse(row: typeof staffRequestsTable.$inferSelect) {
  return {
    id: row.id,
    requestedRole: row.requestedRole as "staff" | "admin",
    verificationStatus: row.verificationStatus as VerificationStatus,
    fullName: row.fullName,
    professionalRole: row.professionalRole,
    phone: row.phone,
    professionalEmail: row.professionalEmail,
    qualification: row.qualification,
    experienceYears: row.experienceYears,
    expertise: row.expertise,
    languagesSpoken: row.languagesSpoken,
    availabilityPreferences: row.availabilityPreferences,
    rejectionReason: row.rejectionReason,
    requestedAt: row.requestedAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  };
}

router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please sign in to access this account." });
    return;
  }
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  const [staffRequest] = await db.select().from(staffRequestsTable).where(eq(staffRequestsTable.clerkUserId, userId)).limit(1);
  res.json(GetMyProfileResponse.parse(profileResponse(profile, staffRequest, userId)));
});

router.patch("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please sign in to access this account." });
    return;
  }
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the required profile details." });
    return;
  }
  const data = {
    ...parsed.data,
    fullName: parsed.data.fullName.trim(),
    preferredName: parsed.data.preferredName?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    dateOfBirth: parsed.data.dateOfBirth?.trim() || null,
    preferredContactMethod: parsed.data.preferredContactMethod?.trim() || null,
    location: parsed.data.location?.trim() || null,
    emergencyContactName: parsed.data.emergencyContactName?.trim() || null,
    emergencyContactPhone: parsed.data.emergencyContactPhone?.trim() || null,
    counsellingReason: parsed.data.counsellingReason?.trim() || null,
    preferredFormat: parsed.data.preferredFormat?.trim() || null,
    preferredLanguage: parsed.data.preferredLanguage?.trim() || null,
    accessibilityRequirements: parsed.data.accessibilityRequirements?.trim() || null,
    counsellingGoals: parsed.data.counsellingGoals?.trim() || null,
  };
  await db.insert(userProfilesTable).values({
    clerkUserId: userId,
    ...data,
    onboardingStatus: "complete",
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: userProfilesTable.clerkUserId,
    set: {
      ...data,
      onboardingStatus: "complete",
      updatedAt: new Date(),
    },
  });
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  const [staffRequest] = await db.select().from(staffRequestsTable).where(eq(staffRequestsTable.clerkUserId, userId)).limit(1);
  res.json(UpdateMyProfileResponse.parse(profileResponse(profile, staffRequest, userId)));
});

router.post("/me/staff-request", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please sign in to access this account." });
    return;
  }
  const parsed = CreateStaffRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete the professional verification details." });
    return;
  }
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.clerkUserId, userId)).limit(1);
  if (profile?.accountType !== parsed.data.requestedRole) {
    res.status(400).json({ error: "Your account request and verification role do not match." });
    return;
  }
  const values = {
    clerkUserId: userId,
    requestedRole: parsed.data.requestedRole,
    verificationStatus: "pending",
    fullName: parsed.data.fullName.trim(),
    professionalRole: parsed.data.professionalRole.trim(),
    phone: parsed.data.phone.trim(),
    professionalEmail: parsed.data.professionalEmail?.trim().toLowerCase() || null,
    qualification: parsed.data.qualification.trim(),
    experienceYears: parsed.data.experienceYears ?? null,
    expertise: parsed.data.expertise.trim(),
    languagesSpoken: parsed.data.languagesSpoken.trim(),
    availabilityPreferences: parsed.data.availabilityPreferences?.trim() || null,
    rejectionReason: null,
    verifiedAt: null,
    verifiedByClerkUserId: null,
  } as const;
  const [request] = await db.insert(staffRequestsTable).values(values).onConflictDoUpdate({
    target: staffRequestsTable.clerkUserId,
    set: values,
  }).returning();
  res.status(201).json(CreateStaffRequestResponse.parse(staffRequestResponse(request)));
});

router.get("/me/appointments", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Please sign in to access this account." });
    return;
  }
  const rows = await db.select({ appointment: appointmentsTable, serviceName: servicesTable.name })
    .from(appointmentsTable)
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.clerkUserId, userId))
    .orderBy(desc(appointmentsTable.createdAt));
  res.json(GetMyAppointmentsResponse.parse(rows.map(({ appointment, serviceName }) => ({
    id: appointment.id,
    serviceId: appointment.serviceId,
    serviceName,
    preferredDate: new Date(`${appointment.preferredDate}T00:00:00Z`),
    preferredTime: appointment.preferredTime,
    name: appointment.name,
    email: appointment.email,
    phone: appointment.phone,
    message: appointment.message,
    status: (appointment.status === "approved" ? "confirmed" : appointment.status === "declined" ? "rejected" : appointment.status) as "pending" | "confirmed" | "cancelled" | "completed" | "rejected",
    createdAt: appointment.createdAt.toISOString(),
  }))));
});

router.get("/admin/staff-requests", requireAdmin, async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const parsedStatus = status === "pending" || status === "verified" || status === "rejected" ? status : undefined;
  if (status && !parsedStatus) {
    res.status(400).json({ error: "Invalid verification status." });
    return;
  }
  const rows = await db.select().from(staffRequestsTable)
    .where(parsedStatus ? eq(staffRequestsTable.verificationStatus, parsedStatus) : undefined)
    .orderBy(desc(staffRequestsTable.requestedAt));
  res.json(GetAdminStaffRequestsResponse.parse(rows.map(staffRequestResponse)));
});

router.patch("/admin/staff-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const paramsId = Number(req.params.id);
  const parsed = UpdateAdminStaffRequestBody.safeParse(req.body);
  if (!Number.isInteger(paramsId) || !parsed.success) {
    res.status(400).json({ error: "Please provide a valid verification decision." });
    return;
  }
  const userId = getUserId(req);
  const verified = parsed.data.verificationStatus === "verified";
  const [updated] = await db.update(staffRequestsTable).set({
    verificationStatus: parsed.data.verificationStatus,
    rejectionReason: verified ? null : parsed.data.rejectionReason?.trim() || null,
    verifiedAt: verified ? new Date() : null,
    verifiedByClerkUserId: verified ? userId : null,
  }).where(eq(staffRequestsTable.id, paramsId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Staff verification request not found." });
    return;
  }
  res.json(UpdateAdminStaffRequestResponse.parse(staffRequestResponse(updated)));
});

export default router;