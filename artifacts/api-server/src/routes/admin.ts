import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  CreateAdminFaqBody,
  CreateAdminServiceBody,
  GetAdminAppointmentsQueryParams,
  GetAdminAvailabilityResponse,
  GetAdminAppointmentsResponse,
  GetAdminContactMessagesResponse,
  GetAdminFaqsResponse,
  GetAdminServicesResponse,
  UpdateAdminAvailabilityBody,
  UpdateAdminFaqBody,
  UpdateAdminServiceBody,
  UpdateAdminAppointmentBody,
} from "@workspace/api-zod";
import {
  appointmentsTable,
  contactMessagesTable,
  db,
  faqsTable,
  practiceSettingsTable,
  servicesTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { buildAvailableSlots, getAvailabilitySettings, inactiveAppointmentStatuses } from "../lib/availability";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

class SlotConflictError extends Error {}

function appointmentResponse(row: typeof appointmentsTable.$inferSelect, serviceName: string) {
  return {
    ...row,
    serviceName,
    preferredDate: new Date(`${row.preferredDate}T00:00:00Z`),
    status: (row.status === "approved" ? "confirmed" : row.status === "declined" ? "rejected" : row.status) as "pending" | "confirmed" | "cancelled" | "completed" | "rejected",
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/admin/appointments", async (req, res, next): Promise<void> => {
  try {
    const query = GetAdminAppointmentsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid appointment filter." });
      return;
    }
    const rows = await db
      .select({ appointment: appointmentsTable, serviceName: servicesTable.name })
      .from(appointmentsTable)
      .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(query.data.status
        ? inArray(appointmentsTable.status, query.data.status === "confirmed" ? ["approved", "confirmed"] : query.data.status === "rejected" ? ["declined", "rejected"] : [query.data.status])
        : undefined)
      .orderBy(desc(appointmentsTable.createdAt));
    res.json(GetAdminAppointmentsResponse.parse(rows.map(({ appointment, serviceName }) => appointmentResponse(appointment, serviceName))));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load admin appointments");
    next(error);
  }
});

router.patch("/admin/appointments/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateAdminAppointmentBody.safeParse(req.body);
    if (!Number.isInteger(id) || !parsed.success || (!parsed.data.status && !parsed.data.preferredDate && !parsed.data.preferredTime)) {
      res.status(400).json({ error: "Please provide a valid appointment update." });
      return;
    }
    const [current] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
    if (!current) {
      res.status(404).json({ error: "Appointment not found." });
      return;
    }
    const preferredDate = parsed.data.preferredDate?.toISOString().slice(0, 10) ?? current.preferredDate;
    const preferredTime = parsed.data.preferredTime ?? current.preferredTime;
    if (parsed.data.preferredDate || parsed.data.preferredTime) {
      const slots = await buildAvailableSlots(preferredDate);
      const currentSlot = slots.some((slot) => `${slot.start}–${slot.end}` === preferredTime || slot.start === preferredTime);
      if (!currentSlot && !(preferredDate === current.preferredDate && preferredTime === current.preferredTime)) {
        res.status(409).json({ error: "That time is not available. Please choose another slot." });
        return;
      }
      const conflict = await db.select({ id: appointmentsTable.id }).from(appointmentsTable).where(and(eq(appointmentsTable.preferredDate, preferredDate), eq(appointmentsTable.preferredTime, preferredTime), notInArray(appointmentsTable.status, ["cancelled", "rejected", "declined"]))).limit(1);
      if (conflict[0] && conflict[0].id !== id) {
        res.status(409).json({ error: "That time is already booked." });
        return;
      }
    }
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${preferredDate}|${preferredTime}`}, 0))`);
      const conflict = await tx
        .select({ id: appointmentsTable.id })
        .from(appointmentsTable)
        .where(and(
          eq(appointmentsTable.preferredDate, preferredDate),
          eq(appointmentsTable.preferredTime, preferredTime),
          notInArray(appointmentsTable.status, [...inactiveAppointmentStatuses]),
        ))
        .limit(2);
      if (conflict.some((appointment) => appointment.id !== id)) {
        throw new SlotConflictError();
      }
      const [saved] = await tx.update(appointmentsTable).set({
        preferredDate,
        preferredTime,
        status: parsed.data.status === "confirmed" ? "approved" : parsed.data.status === "rejected" ? "declined" : parsed.data.status ?? current.status,
      }).where(eq(appointmentsTable.id, id)).returning();
      return saved;
    });
    const [service] = await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.id, updated.serviceId)).limit(1);
    res.json(GetAdminAppointmentsResponse.element.parse(appointmentResponse(updated, service?.name ?? "Service")));
  } catch (error) {
    if (error instanceof SlotConflictError) {
      res.status(409).json({ error: "That time is already booked." });
      return;
    }
    req.log.error({ err: error }, "Failed to update admin appointment");
    next(error);
  }
});

router.get("/admin/availability", async (_req, res): Promise<void> => {
  res.json(GetAdminAvailabilityResponse.parse(await getAvailabilitySettings()));
});

router.patch("/admin/availability", async (req, res, next): Promise<void> => {
  try {
    const parsed = UpdateAdminAvailabilityBody.safeParse(req.body);
    if (!parsed.success || parsed.data.workingStart >= parsed.data.workingEnd) {
      res.status(400).json({ error: "Please check the working hours and availability settings." });
      return;
    }
    const settings = {
      ...parsed.data,
      unavailableDates: parsed.data.unavailableDates.map((date) => date.toISOString().slice(0, 10)),
    };
    const [updated] = await db.insert(practiceSettingsTable).values({ id: 1, ...settings }).onConflictDoUpdate({
      target: practiceSettingsTable.id,
      set: settings,
    }).returning();
    res.json(GetAdminAvailabilityResponse.parse(updated));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update availability settings");
    next(error);
  }
});

function serviceResponse(row: typeof servicesTable.$inferSelect) {
  return { ...row, priceInr: row.priceInr === null ? null : Number(row.priceInr) };
}

router.get("/admin/services", async (_req, res): Promise<void> => {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.id));
  res.json(GetAdminServicesResponse.parse(rows.map(serviceResponse)));
});

router.post("/admin/services", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateAdminServiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please complete the service details." });
      return;
    }
    const [created] = await db.insert(servicesTable).values({
      ...parsed.data,
      priceInr: parsed.data.priceInr === null ? null : String(parsed.data.priceInr),
    }).returning();
    res.status(201).json(GetAdminServicesResponse.element.parse(serviceResponse(created)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create service");
    next(error);
  }
});

router.patch("/admin/services/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateAdminServiceBody.safeParse(req.body);
    if (!Number.isInteger(id) || !parsed.success) {
      res.status(400).json({ error: "Please complete the service details." });
      return;
    }
    const [updated] = await db.update(servicesTable).set({
      ...parsed.data,
      priceInr: parsed.data.priceInr === null ? null : String(parsed.data.priceInr),
    }).where(eq(servicesTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    res.json(GetAdminServicesResponse.element.parse(serviceResponse(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update service");
    next(error);
  }
});

router.delete("/admin/services/:id", async (req, res, next): Promise<void> => {
  try {
    const [deleted] = await db.delete(servicesTable).where(eq(servicesTable.id, Number(req.params.id))).returning({ id: servicesTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete service");
    next(error);
  }
});

function faqResponse(row: typeof faqsTable.$inferSelect) {
  return row;
}

router.get("/admin/faqs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(faqsTable).orderBy(asc(faqsTable.id));
  res.json(GetAdminFaqsResponse.parse(rows.map(faqResponse)));
});

router.post("/admin/faqs", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateAdminFaqBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please complete the FAQ details." });
      return;
    }
    const [created] = await db.insert(faqsTable).values(parsed.data).returning();
    res.status(201).json(GetAdminFaqsResponse.element.parse(faqResponse(created)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create FAQ");
    next(error);
  }
});

router.patch("/admin/faqs/:id", async (req, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateAdminFaqBody.safeParse(req.body);
    if (!Number.isInteger(id) || !parsed.success) {
      res.status(400).json({ error: "Please complete the FAQ details." });
      return;
    }
    const [updated] = await db.update(faqsTable).set(parsed.data).where(eq(faqsTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "FAQ not found." });
      return;
    }
    res.json(GetAdminFaqsResponse.element.parse(faqResponse(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to update FAQ");
    next(error);
  }
});

router.delete("/admin/faqs/:id", async (req, res, next): Promise<void> => {
  try {
    const [deleted] = await db.delete(faqsTable).where(eq(faqsTable.id, Number(req.params.id))).returning({ id: faqsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "FAQ not found." });
      return;
    }
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete FAQ");
    next(error);
  }
});

router.get("/admin/contact-messages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(contactMessagesTable).orderBy(desc(contactMessagesTable.createdAt));
  res.json(GetAdminContactMessagesResponse.parse(rows));
});

export default router;