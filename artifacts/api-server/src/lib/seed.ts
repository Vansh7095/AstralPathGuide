import { count, eq } from "drizzle-orm";
import { db, faqsTable, servicesTable } from "@workspace/db";
import { logger } from "./logger";

const demoServices = [
  {
    name: "Individual counselling",
    description: "A private space to slow down, reflect, and work through what feels difficult.",
    suitableFor: "People seeking support with life transitions, relationships, stress, or personal growth.",
    sessionDetails: "Sessions are conversational and shaped around what feels most useful to you.",
    durationMinutes: 60,
    priceInr: null,
    isPlaceholder: true,
  },
  {
    name: "Relationship counselling",
    description: "Support for couples who want to understand patterns and communicate with more care.",
    suitableFor: "Partners who want guided conversations around connection, conflict, or change.",
    sessionDetails: "The focus and format are discussed together before an appointment is confirmed.",
    durationMinutes: 60,
    priceInr: null,
    isPlaceholder: true,
  },
  {
    name: "Student counselling",
    description: "A supportive space for students navigating pressure, decisions, and change.",
    suitableFor: "Students looking for perspective, practical support, and a place to be heard.",
    sessionDetails: "Sessions are tailored to your context without requiring you to share more than you wish.",
    durationMinutes: 50,
    priceInr: null,
    isPlaceholder: true,
  },
];

const demoFaqs = [
  {
    question: "What happens after I request an appointment?",
    answer: "Your request is reviewed and the practice contacts you to confirm a suitable time. A request is not a confirmed appointment until you receive confirmation.",
  },
  {
    question: "Do I need to know exactly what to talk about?",
    answer: "No. You can begin with what is on your mind, even if it feels unclear. You are welcome to take the conversation at a pace that feels comfortable.",
  },
  {
    question: "Are sessions available online?",
    answer: "Online availability can be configured for the practice. Please check the contact details or ask when you reach out.",
  },
  {
    question: "Is this an emergency service?",
    answer: "No. This website and its forms are not an emergency service. If you are in immediate danger or need urgent assistance, contact your local emergency service or an appropriate crisis resource.",
  },
];

export async function seedDemoContent() {
  const [{ value: serviceCount }] = await db.select({ value: count() }).from(servicesTable);
  if (Number(serviceCount) === 0) {
    await db.insert(servicesTable).values(demoServices);
  }

  const [{ value: faqCount }] = await db.select({ value: count() }).from(faqsTable);
  if (Number(faqCount) === 0) {
    await db.insert(faqsTable).values(demoFaqs);
  }

  logger.info("Counselling practice demo content is ready");
}