import { Router } from "express";
import assetCategoryRoute from "./routes/assetCategoryRoute.js";
import assetRoute from "./routes/assetRoute.js";
import assetIssueRoute from "./routes/assetIssueRoute.js";
import amcVendorRoute from "./routes/amcVendorRoute.js";
import amcContractRoute from "./routes/amcContractRoute.js";
import amcServiceTicketRoute from "./routes/amcServiceTicketRoute.js";

const assetManagementRouter = Router();

assetManagementRouter.use("/assetCategory", assetCategoryRoute);
assetManagementRouter.use("/asset", assetRoute);
assetManagementRouter.use("/assetIssue", assetIssueRoute);
assetManagementRouter.use("/amcVendor", amcVendorRoute);
assetManagementRouter.use("/amcContract", amcContractRoute);
assetManagementRouter.use("/serviceTicket", amcServiceTicketRoute);

export default assetManagementRouter;

