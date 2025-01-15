import { Router } from "express";
const router = Router();
import {
    addTransportRoute,
    getAllTransportRoute,
    getSingleTransportRoute,
    deleteTransportRoute,
    updateTransportRoute
} from "../controllers/transportRouteController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addTransportRoute);

router.get("/", userAuth, getAllTransportRoute);

router.get("/single", userAuth, getSingleTransportRoute);

router.patch("/", userAuth, updateTransportRoute);

router.delete("/", userAuth, deleteTransportRoute);

export default router;
