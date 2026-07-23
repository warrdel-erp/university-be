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
  publishFeePlanProfile,
  deleteFeePlanProfile,
} from "../controllers/feePlanProfileController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

const router = Router();

const id = z.coerce.number().int().positive();
const amount = z.coerce.string().trim().min(1);

const feePlanSubItemLineBase = z.object({
  feeTypeCatalogId: id,
  amount,
  isMainItem: z.boolean().optional(),
  isMainSubItem: z.boolean().optional(),
});

const mapFeePlanSubItemLine = (line) => ({
  feePlanSubitemId: line.feePlanSubitemId,
  feeTypeCatalogId: line.feeTypeCatalogId,
  amount: line.amount,
  isMainItem: line.isMainItem === true || line.isMainSubItem === true,
});

const feePlanSubItemLine = feePlanSubItemLineBase.transform(mapFeePlanSubItemLine);

const feePlanSubItemLineForUpdate = feePlanSubItemLineBase
  .extend({
    feePlanSubitemId: id.optional(),
  })
  .transform(mapFeePlanSubItemLine);

const assertUniqueFeeTypeCatalogIds = (feePlanSubItems, pathPrefix, ctx) => {
  const ids = feePlanSubItems.map((line) => line.feeTypeCatalogId);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "feePlanSubItems must not contain duplicate feeTypeCatalogId",
      path: [...pathPrefix, "feePlanSubItems"],
    });
  }
};

const feePlanItemBody = z
  .object({
    createDate: z.string().trim().min(1),
    dueDate: z.string().trim().optional(),
    feePlanSubItems: z.array(feePlanSubItemLine).min(1),
  })
  .superRefine((item, ctx) => assertUniqueFeeTypeCatalogIds(item.feePlanSubItems, [], ctx));

const feePlanItemForUpdate = z
  .object({
    feePlanItemId: id,
    createDate: z.string().trim().min(1),
    dueDate: z.string().trim().optional(),
    feePlanSubItems: z.array(feePlanSubItemLineForUpdate).min(1),
  })
  .superRefine((item, ctx) => assertUniqueFeeTypeCatalogIds(item.feePlanSubItems, [], ctx));

const publishStatusEnum = z.enum(["draft", "published"]);

const createBody = z.object({
  name: z.string().trim().min(1),
  planType: z.enum(["annual", "semester", "trimester"]),
  category: z.enum(["scholarship", "non-scholarship"]),
  courseSessionId: id,
  publishStatus: publishStatusEnum.optional().default("draft"),
  feePlanItems: z.array(feePlanItemBody).min(1).optional(),
});

const updateBody = z
  .object({
    feePlanProfileId: id,
    name: z.string().trim().min(1).optional(),
    planType: z.enum(["annual", "semester", "trimester"]).optional(),
    category: z.enum(["scholarship", "non-scholarship"]).optional(),
    courseSessionId: id.optional(),
    publishStatus: publishStatusEnum.optional(),
    feePlanItems: z.array(feePlanItemForUpdate).min(1).optional(),
  })
  .superRefine((body, ctx) => {
    const hasUpdate =
      body.name !== undefined ||
      body.planType !== undefined ||
      body.category !== undefined ||
      body.courseSessionId !== undefined ||
      body.publishStatus !== undefined ||
      body.feePlanItems !== undefined;

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

const publishBody = z.object({
  feePlanProfileId: id,
});

router.post("/", userAuth, checkAccess(PERMISSIONS.FEES_PLAN_ADD.value, null), validate({ body: createBody }), addFeePlanProfile);
router.patch("/", userAuth, checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value, null), validate({ body: updateBody }), updateFeePlanProfile);
router.patch("/publish", userAuth, checkAccess(PERMISSIONS.FEES_PLAN_PUBLISH.value, null), validate({ body: publishBody }), publishFeePlanProfile);

router.patch(
  "/assignStudent",
  userAuth,
  checkAccess(PERMISSIONS.FEES_PLAN_EDIT.value, null),
  validate({ body: assignStudentBody }),
  assignFeePlanProfileToStudent
);
router.get("/summary", userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), getFeePlanProfileSummary);
router.get("/all", userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), validate({ query: listAllQuery }), getAllFeePlanProfiles);
router.get("/", userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), validate({ query: listQuery }), getAllFeePlanProfile);
router.get("/single", userAuth, checkAccess(PERMISSIONS.FEES_PLAN.value, null), validate({ query: profileIdQuery }), getSingleFeePlanProfileDetails);
router.delete("/", userAuth, checkAccess(PERMISSIONS.FEES_PLAN_DELETE.value, null), validate({ query: profileIdQuery }), deleteFeePlanProfile);

export default router;
