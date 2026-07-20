import { Router, type IRouter } from "express";
import healthRouter   from "./health";
import whopRouter     from "./whop";
import authRouter     from "./auth";
import usersRouter    from "./users";
import requestsRouter from "./requests";
import jobsRouter     from "./jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(whopRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(requestsRouter);
router.use(jobsRouter);

export default router;
