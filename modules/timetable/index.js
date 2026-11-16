import { Router } from "express";
import timeTableRoute from "./routes/timeTableRoute.js";
import timeTableCreateRoute from "./routes/timeTableCreateRoute.js";
import timetableAcademicGroupRoute from "./routes/timetableAcademicGroupRoute.js";
import attendanceRoute from "./routes/attendanceRoute.js";
import holidayRoute from "./routes/holidayRoute.js";
import scheduleRoute from "./routes/scheduleRoute.js";

const timetableRouter = Router();

timetableRouter.use("/timeTable", timeTableRoute);
timetableRouter.use("/timeTableCreate", timeTableCreateRoute);
timetableRouter.use("/timetableAcademicGroup", timetableAcademicGroupRoute);
timetableRouter.use("/attendance", attendanceRoute);
timetableRouter.use("/holiday", holidayRoute);
timetableRouter.use("/schedule", scheduleRoute);

export default timetableRouter;

