import { Router } from "express";
import * as examinationSessionController from "../controllers/examinationSessionController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { z } from "zod";

const router = Router();

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const sessionBodyObject = z.object({
  assessmentTypeId: z.number({
    required_error: "assessmentTypeId is required",
  }),
  sessionName: z.string().min(1, "sessionName is required"),
  examStartDate: dateStringSchema.optional(),
  examEndDate: dateStringSchema.optional(),
  hallTicketReleaseDate: dateStringSchema.optional(),
  seatAllocationDate: dateStringSchema.optional(),
  evaluationStartDate: dateStringSchema.optional(),
  evaluationDeadline: dateStringSchema.optional(),
  moderationDeadline: dateStringSchema.optional(),
  resultPublicationDate: dateStringSchema.optional(),
  autoGenerateSeating: z.boolean().optional(),
  autoAllocateRooms: z.boolean().optional(),
  autoAssignInvigilators: z.boolean().optional(),
  qrAttendance: z.boolean().optional(),
  barcodeAnswerSheet: z.boolean().optional(),
  aiEvaluation: z.boolean().optional(),
  moderationWorkflow: z.boolean().optional(),
  allowRevaluation: z.boolean().optional(),
  status: z.enum(["Draft", "Published"]).optional(),
  terms: z
    .array(
      z.object({
        term: z.number().int().positive(),
        includeElectives: z.boolean().optional(),
        remarks: z.string().optional(),
      }),
    )
    .optional(),
});

const createSessionSchema = {
  body: sessionBodyObject.refine(
    (data) => {
      const dates = {
        evalDeadline: data.evaluationDeadline
          ? new Date(data.evaluationDeadline).getTime()
          : null,
        modDeadline: data.moderationDeadline
          ? new Date(data.moderationDeadline).getTime()
          : null,
        resultPub: data.resultPublicationDate
          ? new Date(data.resultPublicationDate).getTime()
          : null,
      };

      if (
        dates.evalDeadline &&
        dates.modDeadline &&
        dates.evalDeadline > dates.modDeadline
      ) {
        return false;
      }
      if (
        dates.modDeadline &&
        dates.resultPub &&
        dates.modDeadline > dates.resultPub
      ) {
        return false;
      }

      return true;
    },
    {
      message:
        "Evaluation deadline must be before or equal to Moderation deadline, and Moderation deadline must be before or equal to Result publication date.",
    },
  ),
};

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerQueryId = z.preprocess(
  emptyToUndefined,
  z.union([
    z.string().regex(/^\d+$/).transform(Number),
    z.number().int().positive(),
  ]),
);

const updateSessionSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
  body: sessionBodyObject.partial(),
};

const getSessionByIdSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const createTermSchema = {
  body: z.object({
    examinationSessionId: z.number({
      required_error: "examinationSessionId is required",
    }),
    term: z.number({
      required_error: "term is required",
    }).int().positive(),
    includeElectives: z.boolean().optional(),
    remarks: z.string().optional(),
  }),
};
const deleteTermSchema = {
  query: z.object({
    examinationSessionTermId: positiveIntegerQueryId,
  }),
};

const getClassSectionTermsBySetupTypeSchema = {
  query: z.object({
    examSetupTypeId: positiveIntegerQueryId.optional(),
    examinationSessionId: positiveIntegerQueryId.optional(),
  }),
};

const getStructureSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const questionPaperSummarySchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
  }),
};

const getSubjectsBySessionAndTermSchema = {
  query: z.object({
    examinationSessionId: positiveIntegerQueryId,
    selections: z.preprocess(
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
    ),

    filterStatus: z
      .enum([
        "all",
        "needsScheduling",
        "roomPending",
        "ready",
        "published",
        "notAssigned",
        "assigned",
        "moderationActive",
        "approved",
      ])
      .default("all"),
    date: dateStringSchema.optional(),
  }),
};

router.post(
  "/",
  userAuth,
  validate(createSessionSchema),
  examinationSessionController.createExaminationSession,
);

router.patch(
  "/",
  userAuth,
  validate(updateSessionSchema),
  examinationSessionController.updateExaminationSession,
);
router.get("/", userAuth, examinationSessionController.getExaminationSessions);
router.get(
  "/single",
  userAuth,
  validate(getSessionByIdSchema),
  examinationSessionController.getExaminationSessionById,
);
router.get(
  "/classSectionTerms",
  userAuth,
  validate(getClassSectionTermsBySetupTypeSchema),
  examinationSessionController.getClassSectionTermsBySetupType,
);
router.get(
  "/structure",
  userAuth,
  validate(getStructureSchema),
  examinationSessionController.getExaminationStructure,
);

router.get(
  "/subjects",
  userAuth,
  validate(getSubjectsBySessionAndTermSchema),
  examinationSessionController.getMappedSubjectsBySessionAndTerm,
);

router.get(
  "/questionPaper",
  userAuth,
  validate(getSubjectsBySessionAndTermSchema),
  examinationSessionController.getMappedSubjectsBySessionAndTermNeed,
);

router.get(
  "/questionPaperSummary",
  userAuth,
  validate(questionPaperSummarySchema),
  examinationSessionController.getQuestionPaperSummary,
);


router.delete(
  "/",
  userAuth,
  validate(getSessionByIdSchema),
  examinationSessionController.deleteExaminationSession,
);
router.post(
  "/term",
  userAuth,
  validate(createTermSchema),
  examinationSessionController.createExaminationSessionTerm,
);
router.delete(
  "/term",
  userAuth,
  validate(deleteTermSchema),
  examinationSessionController.deleteExaminationSessionTerm,
);

router.post(
  "/publish",
  userAuth,
  validate({
    query: z.object({
      examinationSessionId: z.coerce.number({
        required_error: "examinationSessionId is required",
      }),
    }),
  }),
  examinationSessionController.publishExaminationSession,
);

router.get(
  "/skuStats",
  userAuth,
  validate({
    query: z.object({
      examinationSessionId: z.coerce.number({
        required_error: "examinationSessionId is required",
      }),
    }),
  }),
  examinationSessionController.getSessionSkuStats,
);

export default router;
