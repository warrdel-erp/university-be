import { Router } from "express";
const router = Router();
import {
    createBundle,
    getBundleById,
    updateBundleStatus
} from "../controllers/examRoomMaterialBundleController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";

const createBundleSchema = {
    body: z.object({
        examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
        examinationSessionSlotId: z.number().int().positive(),
        classRoomSectionId: z.number().int().positive(),
        examRoomMaterialItems: z.array(z.object({
            itemType: z.enum(["ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"]),
            plannedQuantity: z.number().int().nonnegative().optional(),
            remarks: z.string().optional()
        })).min(1, "At least one item is required")
    })
};

const getByIdSchema = {
    query: z.object({
        examRoomMaterialBundleId: z.string().regex(/^\d+$/).transform(Number)
    })
};

const updateStatusSchema = {
    query: z.object({
        examRoomMaterialBundleId: z.string().regex(/^\d+$/).transform(Number)
    }),
    body: z.object({
        status: z.enum(["PREPARING", "READY", "ISSUED", "RECEIVED", "VERIFIED", "CLOSED"]),
        remarks: z.string().optional(),
        issuedTo: z.number().int().positive().optional()
    })
};

router.post("/", userAuth, validate(createBundleSchema), createBundle);
router.get("/single", userAuth, validate(getByIdSchema), getBundleById);
router.patch("/status", userAuth, validate(updateStatusSchema), updateBundleStatus);

export default router;
