import { and, eq, notInArray } from "drizzle-orm";
import { db, appointmentsTable, practiceSettingsTable } from "@workspace/db";

export const defaultAvailability = {
  workingDays: [1, 2, 3, 4, 5],
  workingStart: "10:00",
  workingEnd: "17:00",
  breakStart: null,
  breakEnd: null,
  unavailableDates: [] as string[],
  sessionDurationMinutes: 60,
};

export async function getAvailabilitySettings() {
  const [settings] = await db.select().from(practiceSettingsTable).where(eq(practiceSettingsTable.id, 1)).limit(1);
  return settings ?? defaultAvailability;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes: number) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

export async function buildAvailableSlots(date: string) {
  const settings = await getAvailabilitySettings();
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!settings.workingDays.includes(day) || settings.unavailableDates.includes(date)) return [];

  const duration = settings.sessionDurationMinutes;
  const start = toMinutes(settings.workingStart);
  const end = toMinutes(settings.workingEnd);
  const breakStart = settings.breakStart ? toMinutes(settings.breakStart) : null;
  const breakEnd = settings.breakEnd ? toMinutes(settings.breakEnd) : null;
  const booked = await db
    .select({ preferredTime: appointmentsTable.preferredTime })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.preferredDate, date), notInArray(appointmentsTable.status, ["cancelled", "rejected"])));
  const bookedTimes = new Set(booked.map((appointment) => appointment.preferredTime.split("–")[0]));

  const slots: { start: string; end: string }[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    if (breakStart !== null && breakEnd !== null && cursor < breakEnd && cursor + duration > breakStart) continue;
    const slotStart = formatTime(cursor);
    if (!bookedTimes.has(slotStart)) slots.push({ start: slotStart, end: formatTime(cursor + duration) });
  }
  return slots;
}