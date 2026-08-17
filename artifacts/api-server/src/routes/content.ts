import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, faqsTable, servicesTable } from "@workspace/db";
import { GetFaqsResponse, GetServicesResponse, GetSiteContentResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const siteContent = {
  practiceName: "PRACTICE_NAME",
  counsellorName: "COUNSELLOR_NAME",
  heroTitle: "A thoughtful space to begin again",
  heroDescription: "Support that makes room for your experience, at a pace that feels right for you.",
  about: "This practice is being prepared with care. The counsellor's introduction, qualifications, approach, and availability will appear here once the owner provides and approves the details.",
  qualifications: ["COUNSELLOR_QUALIFICATIONS"],
  languages: ["Languages to be added"],
  location: "Location to be added",
  onlineAvailable: true,
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  workingHours: ["Working hours to be added"],
  timezone: "Asia/Kolkata",
  currency: "INR",
  emergencyDisclaimer:
    "This website is not an emergency service. If you are in immediate danger or need urgent assistance, please contact your local emergency service or an appropriate crisis resource.",
  isPlaceholder: true,
};

router.get("/content", (_req, res) => {
  res.json(GetSiteContentResponse.parse(siteContent));
});

router.get("/services", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.isEnabled, true))
      .orderBy(asc(servicesTable.id));
    const data = rows.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      suitableFor: service.suitableFor,
      sessionDetails: service.sessionDetails,
      durationMinutes: service.durationMinutes,
      priceInr: service.priceInr === null ? null : Number(service.priceInr),
      isPlaceholder: service.isPlaceholder,
    }));
    res.json(GetServicesResponse.parse(data));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load services");
    next(error);
  }
});

router.get("/faqs", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(faqsTable)
      .where(eq(faqsTable.isPublished, true))
      .orderBy(asc(faqsTable.id));
    res.json(GetFaqsResponse.parse(rows));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load FAQs");
    next(error);
  }
});

export default router;