import { Router } from 'express';
import * as examinationSessionController from '../controllers/examinationSessionController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import { z } from 'zod';

const router = Router();

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const sessionBodyObject = z.object({
  assessmentTypeId: z.number({ required_error: "assessmentTypeId is required" }),
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
  status: z.enum(['Draft', 'Published', 'Completed', 'Cancelled']).optional(),
  classSectionTerms: z.array(z.object({
    classSectionTermId: z.number(),
    includeElectives: z.boolean().optional(),
    remarks: z.string().optional(),
  })).optional(),
});

const createSessionSchema = {
  body: sessionBodyObject.refine((data) => {
    const dates = {
      examStart: data.examStartDate ? new Date(data.examStartDate).getTime() : null,
      examEnd: data.examEndDate ? new Date(data.examEndDate).getTime() : null,
      hallTicket: data.hallTicketReleaseDate ? new Date(data.hallTicketReleaseDate).getTime() : null,
      seatAlloc: data.seatAllocationDate ? new Date(data.seatAllocationDate).getTime() : null,
      evalStart: data.evaluationStartDate ? new Date(data.evaluationStartDate).getTime() : null,
      evalDeadline: data.evaluationDeadline ? new Date(data.evaluationDeadline).getTime() : null,
      modDeadline: data.moderationDeadline ? new Date(data.moderationDeadline).getTime() : null,
      resultPub: data.resultPublicationDate ? new Date(data.resultPublicationDate).getTime() : null,
    };

    if (dates.examStart && dates.examEnd && dates.examStart > dates.examEnd) {
      return false;
    }
    if (dates.hallTicket && dates.examStart && dates.hallTicket > dates.examStart) {
      return false;
    }
    if (dates.seatAlloc && dates.examStart && dates.seatAlloc > dates.examStart) {
      return false;
    }
    if (dates.evalStart && dates.evalDeadline && dates.evalStart > dates.evalDeadline) {
      return false;
    }
    if (dates.evalDeadline && dates.modDeadline && dates.evalDeadline > dates.modDeadline) {
      return false;
    }
    if (dates.modDeadline && dates.resultPub && dates.modDeadline > dates.resultPub) {
      return false;
    }

    return true;
  }, {
    message: "Invalid date chronological order. Expected sequence: Hall Ticket / Seat Allocation <= Exam Start <= Exam End <= Evaluation Start <= Evaluation Deadline <= Moderation Deadline <= Result Publication Date",
  }),
};

const emptyToUndefined = (val) =>
  val === "" || val === null || val === undefined ? undefined : val;

const positiveIntegerQueryId = z.preprocess(
  emptyToUndefined,
  z.union([z.string().regex(/^\d+$/).transform(Number), z.number().int().positive()])
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
    examinationSessionId: z.number({ required_error: "examinationSessionId is required" }),
    classSectionTermId: z.number({ required_error: "classSectionTermId is required" }),
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
    examSetupTypeId: positiveIntegerQueryId,
  }),
};

router.post('/', userAuth, validate(createSessionSchema), examinationSessionController.createExaminationSession);
router.get('/', userAuth, examinationSessionController.getExaminationSessions);
router.get('/single', userAuth, validate(getSessionByIdSchema), examinationSessionController.getExaminationSessionById);
router.get('/classSectionTerms', userAuth, validate(getClassSectionTermsBySetupTypeSchema), examinationSessionController.getClassSectionTermsBySetupType);
router.patch('/', userAuth, validate(updateSessionSchema), examinationSessionController.updateExaminationSession);
router.delete('/', userAuth, validate(getSessionByIdSchema), examinationSessionController.deleteExaminationSession);

router.post('/term', userAuth, validate(createTermSchema), examinationSessionController.createExaminationSessionTerm);
router.delete('/term', userAuth, validate(deleteTermSchema), examinationSessionController.deleteExaminationSessionTerm);

export default router;
