import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addFeePlanProfile,
  updateFeePlanProfile,
  getAllFeePlanProfile,
  getAllFeePlanProfiles,
  getFeePlanProfileSummary,
  getSingleFeePlanProfileDetails,
  assignFeePlanProfileToStudent,
} from "../controllers/feePlanProfileController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const id = z.coerce.number().int().positive();
const amount = z.coerce.string().trim().min(1);

const catalogLine = z.object({
  feeTypeCatalogId: id,
  amount,
  isMainItem: z.boolean().optional().default(false),
});

const feePlanItem = z
  .object({
    startDate: z.string().trim().min(1),
    dueDate: z.string().trim().optional(),
    feeTypeCatalogs: z.array(catalogLine).min(1),
  })
  .superRefine((item, ctx) => {
    const ids = item.feeTypeCatalogs.map((line) => line.feeTypeCatalogId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "feeTypeCatalogs must not contain duplicate feeTypeCatalogId",
        path: ["feeTypeCatalogs"],
      });
    }
  });

const createBody = z.object({
  name: z.string().trim().min(1),
  planType: z.enum(["annual", "semester", "trimester"]),
  courseSessionId: id,
  academicYearId: id.optional(),
  feePlanItems: z.array(feePlanItem).min(1).optional(),
});

const feePlanSubItemLine = z.object({
  feePlanSubitemId: id,
  feeTypeCatalogId: id,
  amount,
  isMainItem: z.boolean().optional().default(false),
});

const updateBody = z
  .object({
    feePlanProfileId: id,
    name: z.string().trim().min(1).optional(),
    planType: z.enum(["annual", "semester", "trimester"]).optional(),
    courseSessionId: id.optional(),
    academicYearId: id.optional(),
    feePlanSubItems: z.array(feePlanSubItemLine).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    const hasUpdate =
      body.name !== undefined ||
      body.planType !== undefined ||
      body.courseSessionId !== undefined ||
      body.academicYearId !== undefined ||
      body.feePlanSubItems !== undefined;

    if (!hasUpdate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field to update is required besides feePlanProfileId",
      });
    }
  });

const profileIdQuery = z.object({ feePlanProfileId: id });
const listQuery = z.object({ courseSessionId: id });
const listAllQuery = z
  .object({
    status: z.enum(["all", "active", "inactive"]).optional(),
  })
  .transform((d) => ({
    status: d.status ?? "all",
  }));

const assignStudentBody = z.object({
  studentId: id,
  feePlanProfileId: id,
});

router.post("/", userAuth, validate({ body: createBody }), addFeePlanProfile);
router.patch("/", userAuth, validate({ body: updateBody }), updateFeePlanProfile);

router.patch(
  "/assignStudent",
  userAuth,
  validate({ body: assignStudentBody }),
  assignFeePlanProfileToStudent
);
router.get("/summary", userAuth, getFeePlanProfileSummary);
router.get("/all", userAuth, validate({ query: listAllQuery }), getAllFeePlanProfiles);
router.get("/", userAuth, validate({ query: listQuery }), getAllFeePlanProfile);
router.get("/single", userAuth, validate({ query: profileIdQuery }), getSingleFeePlanProfileDetails);

export default router;
