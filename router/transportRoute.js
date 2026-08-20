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
import { z } from "zod";
import { validate } from "../utility/validation.js";

const transportRouteQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

router.post("/", userAuth, addTransportRoute);

router.get("/", userAuth, validate({ query: transportRouteQuerySchema }), getAllTransportRoute);

router.get("/single", userAuth, getSingleTransportRoute);

router.patch("/", userAuth, updateTransportRoute);

router.delete("/", userAuth, deleteTransportRoute);

export default router;
