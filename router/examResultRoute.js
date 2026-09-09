import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import * as examResultController from "../controllers/examResultController.js";

const router = Router();

const id = z.coerce.number().int().positive();

const selections = z.preprocess(
  (val) => {
    if (!val || val === "") return undefined;
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return undefined;
    }
  },
  z
    .array(
      z.object({
        courseSessionMappingId: z.number().int().positive(),
        terms: z.array(z.number().int().positive()),
      }),
    )
    .optional(),
);

const filterStatusQuery = z.preprocess(
  (val) => {
    if (val == null || val === "") return undefined;
    const normalized = String(val)
      .trim()
      .toLowerCase()
      .replace(/[_\s-]/g, "");
    if (normalized === "ready") return "Ready";
    if (normalized === "notready") return "NotReady";
    if (normalized === "published") return "Published";
    if (normalized === "generated") return "Generated";
    return val;
  },
  z.enum(["Ready", "NotReady", "Published", "Generated"]).optional(),
);

const query = z.object({
  examinationSessionId: id.optional(),
  selections,
  search: z.string().trim().optional(),
  filterStatus: filterStatusQuery,
  page: id.optional().default(1),
  limit: id.optional().default(20),
});

const skuQuery = z.object({
  examinationSessionId: id,
});

const createExaminationSessionResultBody = z.object({
  examinationSessionId: id,
  studentIds: z.array(id).min(1),
});

const publishedResultQuery = z.object({
  examinationSessionId: id,
  studentId: id,
});

router.get(
  "/sku",
  userAuth,
  validate({ query: skuQuery }),
  examResultController.getSku,
);
router.get(
  "/students",
  userAuth,
  validate({ query }),
  examResultController.listStudents,
);
router.get(
  "/students/:studentId",
  userAuth,
  validate({ params: z.object({ studentId: id }), query }),
  examResultController.getStudentById,
);
router.post(
  "/examinationSessionResult",
  userAuth,
  validate({ body: createExaminationSessionResultBody }),
  examResultController.createExaminationSessionResult,
);
router.post(
  "/publish",
  userAuth,
  validate({ body: createExaminationSessionResultBody }),
  examResultController.publishExaminationSessionResults,
);
router.get(
  "/publishHistory",
  userAuth,
  validate({ query: z.object({ examinationSessionId: id }) }),
  examResultController.getPublishHistory,
);
router.get(
  "/publishHistory/:publishBatchId",
  userAuth,
  validate({ params: z.object({ publishBatchId: z.string().uuid() }) }),
  examResultController.getPublishHistoryByBatchId,
);
router.get(
  "/result",
  userAuth,
  validate({ query: publishedResultQuery }),
  examResultController.getStudentResultDetails,
);

export default router;
