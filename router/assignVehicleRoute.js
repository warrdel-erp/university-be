import { Router } from "express";
const router = Router();
import {
    addAssignVehicle,
    getAssignVehicle,
    getSingleAssignVehicle,
    deleteAssignVehicle,
    updateAssignVehicle
} from "../controllers/assignVehicleController.js";
import userAuth from "../middleware/authUser.js";

router.post("/", userAuth, addAssignVehicle);

router.get("/", userAuth, getAssignVehicle);

router.get("/single", userAuth, getSingleAssignVehicle);

router.patch("/", userAuth, updateAssignVehicle);

router.delete("/", userAuth, deleteAssignVehicle);

export default router;
