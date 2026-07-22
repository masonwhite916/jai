import { Router, type IRouter } from "express";
import healthRouter        from "./health";
import whopRouter          from "./whop";
import authRouter          from "./auth";
import usersRouter         from "./users";
import requestsRouter      from "./requests";
import jobsRouter          from "./jobs";
import adminRouter         from "./admin";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(whopRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(requestsRouter);
router.use(jobsRouter);
router.use(adminRouter);
router.use(notificationsRouter);

export default router;
