import { Router } from "express";
import campusRoute from "./routes/campusRoute.js";
import instituteRoute from "./routes/instituteRoute.js";
import buildingRoute from "./routes/buildingRoute.js";
import governanceBodyRoute from "./routes/governanceBodyRoute.js";
import floorRoute from "./routes/floorRoute.js";
import headRoute from "./routes/headRoute.js";
import departmentRoute from "./routes/departmentRoute.js";
import staffRoute from "./routes/staffRoute.js";
import departmentPositionsRoute from "./routes/departmentPositionsRoute.js";
import classRoomRoute from "./routes/classRoomRoute.js";

const organizationRouter = Router();

organizationRouter.use("/campus", campusRoute);
organizationRouter.use("/institute", instituteRoute);
organizationRouter.use("/head", headRoute);
organizationRouter.use("/building", buildingRoute);
organizationRouter.use("/governanceBody", governanceBodyRoute);
organizationRouter.use("/floor", floorRoute);
organizationRouter.use("/department", departmentRoute);
organizationRouter.use("/staff", staffRoute);
organizationRouter.use("/departmentPosition", departmentPositionsRoute);
organizationRouter.use("/classRoom", classRoomRoute);

export default organizationRouter;

