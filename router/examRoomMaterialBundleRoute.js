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
    .optional(),
);

const listSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerId,
    examDate: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD")
        .optional(),
    ),
    examinationSessionSlotId: positiveIntegerQueryId,
    status: z.preprocess(
      emptyToUndefined,
      z
        .enum([
          "PREPARING",
          "READY",
          "ISSUED",
          "RECEIVED",
          "VERIFIED",
          "CLOSED",
        ])
        .optional(),
    ),
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
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
    examinationSessionSlotId: positiveIntegerId,
    classRoomSectionId: positiveIntegerId,
    items: z
      .array(
        z.object({
          itemType: z.enum([
            "ANSWER_SHEET",
            "EXTRA_SHEET",
            "GRAPH_SHEET",
            "ROUGH_SHEET",
            "ATTENDANCE_SHEET",
            "ROOM_KIT",
          ]),
          plannedQuantity: z.number().int().min(0).optional(),
          remarks: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
  }),
};

const updateItemsSchema = {
  params: z.object({
    examRoomMaterialBundleId: positiveIntegerId,
  }),
  body: z.object({
    status: z
      .enum(["PREPARING", "READY", "ISSUED", "RECEIVED", "VERIFIED", "CLOSED"])
      .optional(),
    remarks: z.string().optional(),
    issuedTo: positiveIntegerQueryId,
    items: z
      .array(
        z.object({
          itemType: z.enum([
            "ANSWER_SHEET",
            "EXTRA_SHEET",
            "GRAPH_SHEET",
            "ROUGH_SHEET",
            "ATTENDANCE_SHEET",
            "ROOM_KIT",
          ]),
          plannedQuantity: z.number().int().min(0).optional(),
          issuedQuantity: z.number().int().min(0).optional(),
          usedQuantity: z.number().int().min(0).optional(),
          unusedQuantity: z.number().int().min(0).optional(),
          returnedQuantity: z.number().int().min(0).optional(),
          damagedQuantity: z.number().int().min(0).optional(),
          remarks: z.string().optional(),
        }),
      )
      .optional(),
  }),
};

const singleQuerySchema = {
  query: z.object({
    classRoomSectionId: positiveIntegerId,
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, must be YYYY-MM-DD"),
    examinationSessionSlotId: positiveIntegerId,
  }),
};

router.get("/", userAuth, validate(listSchema), controller.getBundleList);

router.get(
  "/room",
  userAuth,
  validate(singleQuerySchema),
  controller.getBundleByRoomDetails,
);

router.post("/", userAuth, validate(createSchema), controller.createBundle);
router.patch(
  "/items/:examRoomMaterialBundleId",
  userAuth,
  validate(updateItemsSchema),
  controller.updateBundleItems,
);

export default router;
