import { Router, type IRouter } from "express";
import healthRouter from "./health";
import whopRouter from "./whop";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(whopRouter);
router.use(authRouter);

export default router;
