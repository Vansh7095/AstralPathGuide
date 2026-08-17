import { Router, type IRouter } from "express";
import { and, eq, notInArray } from "drizzle-orm";
import {
  CreateAppointmentBody,
  CreateAppointmentResponse,
  GetAvailabilityQueryParams,
  GetAvailabilityResponse,
} from "@workspace/api-zod";
import { db, appointmentsTable, servicesTable } from "@workspace/db";
import { buildAvailableSlots } from "../lib/availability";

const router: IRouter = Router();

router.get("/availability", async (req, res, next) => {
  try {
    const parsed = GetAvailabilityQueryParams.parse({
      date: new Date(String(req.query.date)),
    });
    const date = parsed.date.toISOString().slice(0, 10);
    const data = await buildAvailableSlots(date);
    res.json(GetAvailabilityResponse.parse(data));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load appointment availability");
    next(error);
  }
});

router.post("/appointments", async (req, res, next) => {
  try {
    const input = CreateAppointmentBody.parse(req.body);
    const service = await db
      .select()
      .from(servicesTable)
      .where(and(eq(servicesTable.id, input.serviceId), eq(servicesTable.isEnabled, true)))
      .limit(1);

    if (!service[0]) {
      res.status(400).json({ error: "That service is not available." });
      return;
    }

    const preferredDate = input.preferredDate.toISOString().slice(0, 10);
    const available = (await buildAvailableSlots(preferredDate)).some(
      (slot) => slot.start === input.preferredTime || `${slot.start}–${slot.end}` === input.preferredTime,
    );
    if (!available) {
      res.status(409).json({ error: "Please choose a weekday time slot." });
      return;
    }

    const existing = await db
      .select({ id: appointmentsTable.id })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.preferredDate, preferredDate),
          eq(appointmentsTable.preferredTime, input.preferredTime),
          notInArray(appointmentsTable.status, ["cancelled", "rejected", "declined"]),
        ),
      )
      .limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "That time was just requested by someone else. Please choose another slot." });
      return;
    }

    const [created] = await db
      .insert(appointmentsTable)
      .values({
        serviceId: input.serviceId,
        preferredDate,
        preferredTime: input.preferredTime,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        message: input.message?.trim() || null,
      })
      .returning();

    const response = {
      id: created.id,
      serviceId: created.serviceId,
      serviceName: service[0].name,
      preferredDate: new Date(`${created.preferredDate}T00:00:00Z`),
      preferredTime: created.preferredTime,
      name: created.name,
      email: created.email,
      phone: created.phone,
      message: created.message,
      status: created.status as "pending",
      createdAt: created.createdAt.toISOString(),
    };
    res.status(201).json(CreateAppointmentResponse.parse(response));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create appointment request");
    next(error);
  }
});

export default router;