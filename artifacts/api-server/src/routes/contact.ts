import { Router, type IRouter } from "express";
import { CreateContactMessageBody, CreateContactMessageResponse } from "@workspace/api-zod";
import { db, contactMessagesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/contact-messages", async (req, res, next) => {
  try {
    const input = CreateContactMessageBody.parse(req.body);
    const [created] = await db
      .insert(contactMessagesTable)
      .values({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        message: input.message.trim(),
      })
      .returning({ id: contactMessagesTable.id });
    res.status(201).json(CreateContactMessageResponse.parse({ id: created.id, received: true }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create contact message");
    next(error);
  }
});

export default router;