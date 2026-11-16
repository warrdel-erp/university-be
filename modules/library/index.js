import { Router } from "express";
import libraryCreationRoute from "./routes/libraryCreationRoute.js";
import libraryStructureRoute from "./routes/libraryStructureRoute.js";
import libraryIssueBookTransactionRoute from "./routes/libraryIssueBookTransactionRoute.js";

const libraryRouter = Router();

libraryRouter.use("/libraryCreation", libraryCreationRoute);
libraryRouter.use("/libraryStructure", libraryStructureRoute);
libraryRouter.use("/libraryIssueBook", libraryIssueBookTransactionRoute);

export default libraryRouter;

