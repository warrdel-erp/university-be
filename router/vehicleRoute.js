import { Router } from "express";
const router = Router();
import {
    addVehicle,
    getVehicle,
    getSingleVehicle,
    deleteVehicle,
    updateVehicle
} from "../controllers/vehicleController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addVehicle);

router.get("/", userAuth, getVehicle);

router.get("/single", userAuth, getSingleVehicle);

router.patch("/", userAuth, updateVehicle);

router.delete("/", userAuth, deleteVehicle);

export default router;
