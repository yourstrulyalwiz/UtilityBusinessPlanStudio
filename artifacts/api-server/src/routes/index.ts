import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import portfolioRouter from "./portfolio";
import peopleRouter from "./people";
import requestsRouter from "./requests";
import storageRouter from "./storage";
import testModeRouter from "./test-mode";
import planExportRouter from "./plan-export";
import workflowRouter from "./workflow";
import modulesRouter from "./modules";

const router: IRouter = Router();

router.use(healthRouter);
router.use(testModeRouter);
router.use(planExportRouter);
router.use(workflowRouter);
router.use(modulesRouter);
router.use(authRouter);
router.use(portfolioRouter);
router.use(peopleRouter);
router.use(requestsRouter);
router.use(storageRouter);

export default router;
