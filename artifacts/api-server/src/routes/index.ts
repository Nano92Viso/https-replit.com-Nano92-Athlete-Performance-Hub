import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import neuromuscularRouter from "./neuromuscular";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import generatorRouter from "./generator";
import teamsRouter from "./teams";
import injuriesRouter from "./injuries";
import playerGroupsRouter from "./player_groups";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(teamsRouter);
router.use(injuriesRouter);
router.use(playerGroupsRouter);
router.use(playersRouter);
router.use(neuromuscularRouter);
router.use(generatorRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);

export default router;
