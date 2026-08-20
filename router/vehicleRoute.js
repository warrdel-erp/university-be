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
import { z } from "zod";
import { validate } from "../utility/validation.js";

const vehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

router.post("/", userAuth, addVehicle);

router.get("/", userAuth, validate({ query: vehicleQuerySchema }), getVehicle);

router.get("/single", userAuth, getSingleVehicle);

router.patch("/", userAuth, updateVehicle);

router.delete("/", userAuth, deleteVehicle);

export default router;
