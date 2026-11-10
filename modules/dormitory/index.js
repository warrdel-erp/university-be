import { Router } from "express";
import addDormitoryRoute from "./routes/addDormitoryRoute.js";
import dormitoryListRoute from "./routes/dormitoryListRoute.js";
import roomTypeRoute from "./routes/roomTypeRoute.js";

const dormitoryRouter = Router();

dormitoryRouter.use("/dormitoryRoomType", roomTypeRoute);
dormitoryRouter.use("/dormitoryList", dormitoryListRoute);
dormitoryRouter.use("/addDormitory", addDormitoryRoute);

export default dormitoryRouter;

