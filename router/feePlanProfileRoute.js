import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addFeePlanProfile,
  lookupFeePlanProfiles,
  getAllFeePlanProfile,
  getAllFeePlanProfiles,
  getFeePlanProfileSummary,
  getSingleFeePlanProfileDetails,
  updateFeePlanProfile,
} from "../controllers/feePlanProfileController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const id = z.coerce.number().int().positive();
const amount = z.coerce.string().trim().min(1);

const catalogLine = z.object({
  feeTypeCatalogId: id,
  amount,
});

const feePlanItem = z.object({
  name: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  dueDate: z.string().trim().optional(),
  amount,
  feeTypeCatalogs: z.array(catalogLine).optional(),
});

const createBody = z.object({
  name: z.string().trim().min(1),
  planType: z.enum(["annual", "semester", "trimester"]),
  courseSessionId: id,
  academicYearId: id.optional(),
  feePlanItems: z.array(feePlanItem).min(1).optional(),
});

const updateBody = z
  .object({
    feePlanProfileId: id,
    name: z.string().trim().min(1).optional(),
    planType: z.enum(["annual", "semester", "trimester"]).optional(),
    courseSessionId: id.optional(),
    academicYearId: id.optional(),
    feePlanItems: z.array(feePlanItem).min(1).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.planType !== undefined ||
      d.courseSessionId !== undefined ||
      d.academicYearId !== undefined ||
      (d.feePlanItems && d.feePlanItems.length > 0),
    { message: "At least one field is required to update" }
  );

const profileIdQuery = z.object({ feePlanProfileId: id });
const listQuery = z.object({ courseSessionId: id });

router.post("/", userAuth, validate({ body: createBody }), addFeePlanProfile);
router.get("/summary", userAuth, getFeePlanProfileSummary);
router.get("/all", userAuth, getAllFeePlanProfiles);
router.get("/lookup", userAuth, validate({ query: listQuery }), lookupFeePlanProfiles);
router.get("/", userAuth, validate({ query: listQuery }), getAllFeePlanProfile);
router.get("/single", userAuth, validate({ query: profileIdQuery }), getSingleFeePlanProfileDetails);
router.patch("/", userAuth, validate({ body: updateBody }), updateFeePlanProfile);

export default router;
