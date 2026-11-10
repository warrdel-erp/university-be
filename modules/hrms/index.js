import { Router } from "express";
import employeeRoute from "./routes/employeeRoute.js";
import teacherMappingRoute from "./routes/teacherMappingRoute.js";
import teacherSubstituteRoute from "./routes/teacherSubstituteRoute.js";
import faculityLoadRoute from "./routes/faculityLoadRoute.js";
import leavePolicyRouter from "./routes/leavePolicyRouter.js";
import leaveRequestRouter from "./routes/leaveRequestRouter.js";
import approvalRequestRouter from "./routes/approvalRequestRouter.js";
import leaveBalanceRouter from "./routes/leaveBalanceRouter.js";

const hrmsRouter = Router();

hrmsRouter.use("/employee", employeeRoute);
hrmsRouter.use("/teacher", teacherMappingRoute);
hrmsRouter.use("/teacherSubstitute", teacherSubstituteRoute);
hrmsRouter.use("/faculityLoad", faculityLoadRoute);
hrmsRouter.use("/leave-policies", leavePolicyRouter);
hrmsRouter.use("/leave-requests", leaveRequestRouter);
hrmsRouter.use("/approval-requests", approvalRequestRouter);
hrmsRouter.use("/leave-balance", leaveBalanceRouter);

export default hrmsRouter;

