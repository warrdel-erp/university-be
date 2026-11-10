import { Router } from "express";
import transportRoute from "./routes/transportRoute.js";
import vehicleRoute from "./routes/vehicleRoute.js";
import assignVehicleRoute from "./routes/assignVehicleRoute.js";

const transportRouter = Router();

transportRouter.use("/transportRoute", transportRoute);
transportRouter.use("/vehicle", vehicleRoute);
transportRouter.use("/assignVehicle", assignVehicleRoute);

export default transportRouter;

