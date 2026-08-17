import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import bookingRouter from "./booking";
import contactRouter from "./contact";
import adminRouter from "./admin";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contentRouter);
router.use(bookingRouter);
router.use(contactRouter);
router.use(adminRouter);
router.use(accountRouter);

export default router;
