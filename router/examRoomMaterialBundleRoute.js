import { Router } from "express";
import { validate } from "../utility/validation.js";
import { z } from "zod";
import * as controller from "../controllers/examRoomMaterialBundleController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerId = z.union([
  z.string().regex(/^\d+$/).transform(Number),
  z.number().int().positive(),
]);

const positiveIntegerQueryId = z.preprocess(
  emptyToUndefined,
  z
    .union([
      z.string().regex(/^\d+$/).transform(Number),
      z.number().int().positive(),
    ])
    .optional()
);

const listSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerId,
    examDate: z.preprocess(
      emptyToUndefined,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD").optional()
    ),
    examinationSessionSlotId: positiveIntegerQueryId,
    status: z.preprocess(emptyToUndefined, z.enum(["PREPARING", "READY", "ISSUED", "RECEIVED", "VERIFIED", "CLOSED"]).optional()),
    search: z.preprocess(emptyToUndefined, z.string().optional()),
    page: positiveIntegerQueryId,
    limit: positiveIntegerQueryId,
  }),
};

const idParamSchema = {
  params: z.object({
    examRoomMaterialBundleId: positiveIntegerId,
  }),
};

const createSchema = {
  body: z.object({
    examScheduleId: positiveIntegerId,
    examScheduleRoomCapacityId: positiveIntegerId,
    items: z.array(
      z.object({
        itemType: z.enum(["ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"]),
        plannedQuantity: z.number().int().min(0).optional(),
        remarks: z.string().optional(),
      })
    ).optional().default([]),
  }),
};

const updateItemsSchema = {
  params: z.object({
    examRoomMaterialBundleId: positiveIntegerId,
  }),
  body: z.object({
    items: z.array(
      z.object({
        itemType: z.enum(["ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"]),
        plannedQuantity: z.number().int().min(0).optional(),
        issuedQuantity: z.number().int().min(0).optional(),
        usedQuantity: z.number().int().min(0).optional(),
        unusedQuantity: z.number().int().min(0).optional(),
        returnedQuantity: z.number().int().min(0).optional(),
        damagedQuantity: z.number().int().min(0).optional(),
        remarks: z.string().optional(),
      })
    ).min(1, "At least one item must be provided"),
  }),
};

const updateStatusSchema = {
  params: z.object({
    examRoomMaterialBundleId: positiveIntegerId,
  }),
  body: z.object({
    status: z.enum(["ISSUED", "RECEIVED", "VERIFIED", "CLOSED"]),
    issuedTo: positiveIntegerQueryId,
    remarks: z.string().optional(),
  }),
};

const bulkPrepareSchema = {
  body: z.object({
    roomCapacityIds: z.array(positiveIntegerId).min(1, "At least one room capacity ID must be provided"),
    defaultItems: z.array(
      z.object({
        itemType: z.enum(["ANSWER_SHEET", "EXTRA_SHEET", "GRAPH_SHEET", "ROUGH_SHEET", "ATTENDANCE_SHEET", "ROOM_KIT"]),
        plannedQuantity: z.number().int().min(0).optional(),
      })
    ).optional().default([]),
  }),
};

router.get("/", userAuth, validate(listSchema), controller.getBundleList);
router.get("/single/:examRoomMaterialBundleId", userAuth, validate(idParamSchema), controller.getBundleById);
router.post("/", userAuth, validate(createSchema), controller.createBundle);
router.patch("/items/:examRoomMaterialBundleId", userAuth, validate(updateItemsSchema), controller.updateBundleItems);
router.patch("/ready/:examRoomMaterialBundleId", userAuth, validate(idParamSchema), controller.markReady);
router.patch("/reopen/:examRoomMaterialBundleId", userAuth, validate(idParamSchema), controller.reopenBundle);
router.patch("/status/:examRoomMaterialBundleId", userAuth, validate(updateStatusSchema), controller.updateBundleStatus);
router.post("/bulk-prepare", userAuth, validate(bulkPrepareSchema), controller.bulkPrepare);
router.get("/cover/:examRoomMaterialBundleId", userAuth, validate(idParamSchema), controller.getBundleCoverData);

export default router;
