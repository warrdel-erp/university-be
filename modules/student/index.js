import { Router } from "express";
import studentRoute from "./routes/studentRoute.js";
import academicGroupRoute from "./routes/academicGroupRoute.js";
import classSectionRoute from "./routes/classSectionRoute.js";
import previousAcademicRoute from "./routes/previousAcademicRoute.js";

const studentRouter = Router();

studentRouter.use("/student", studentRoute);
studentRouter.use("/academicGroup", academicGroupRoute);
studentRouter.use("/classSections", classSectionRoute);
studentRouter.use("/previousAcademic", previousAcademicRoute);

export default studentRouter;

