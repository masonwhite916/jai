import { Router, type IRouter } from "express";
import healthRouter        from "./health";
import paymentRouter       from "./moyasar";
import authRouter          from "./auth";
import usersRouter         from "./users";
import requestsRouter      from "./requests";
import jobsRouter          from "./jobs";
import adminRouter         from "./admin";
import notificationsRouter from "./notifications";
import vehiclesRouter      from "./vehicles";
import chatRouter          from "./chat";
import uploadsRouter       from "./uploads";
import ratingsRouter       from "./ratings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadsRouter);
router.use(paymentRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(requestsRouter);
router.use(jobsRouter);
router.use(adminRouter);
router.use(notificationsRouter);
router.use(vehiclesRouter);
router.use(chatRouter);
router.use(ratingsRouter);

export default router;
