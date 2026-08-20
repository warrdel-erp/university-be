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
import { z } from "zod";
import { validate } from "../utility/validation.js";

const assignVehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

router.post("/", userAuth, addAssignVehicle);

router.get("/", userAuth, validate({ query: assignVehicleQuerySchema }), getAssignVehicle);

router.get("/single", userAuth, getSingleAssignVehicle);

router.patch("/", userAuth, updateAssignVehicle);

router.delete("/", userAuth, deleteAssignVehicle);

export default router;
