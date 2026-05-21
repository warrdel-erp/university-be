import { Router } from "express";
import { z } from "zod";
import moment from "moment";
import { validate } from "../utility/validation.js";
import {
  addMember,
  getMemberDetails,
  getSingleMemberDetails,
  updateMember,
  deleteMember,
  bookIssue,
  getAllIssueBooks,
  getBookByMemberId,
  updateBookAndStatus,
  deleteBook,
} from "../controllers/libraryMemberController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const libraryMemberIdQuerySchema = z.object({
  libraryMemberId: z.coerce.number(),
});

const libraryCreationIdQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
});

const libraryIssueBookIdQuerySchema = z.object({
  libraryIssueBookId: z.coerce.number(),
});

const issueBookStatusEnum = z.enum(["Issued", "Returned", "Renewed", "Overdue"]);

function validateMemberIds(data, ctx) {
  const type = data.memberType.trim().toLowerCase();

  if (type.includes("student")) {
    if (!data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "studentId is required for student member",
        path: ["studentId"],
      });
    }
    return;
  }

  if (type.includes("employee")) {
    if (!data.employeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "employeeId is required for employee member",
        path: ["employeeId"],
      });
    }
    return;
  }

  if (!data.studentId && !data.employeeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "studentId or employeeId is required",
      path: ["studentId"],
    });
  }
}

const addMemberSchema = z
  .object({
    libraryCreationId: z.coerce.number(),
    memberType: z.string().min(1),
    studentId: z.coerce.number().optional(),
    employeeId: z.coerce.number().optional(),
  })
  .superRefine(validateMemberIds);

const updateMemberSchema = z
  .object({
    libraryMemberId: z.coerce.number(),
    memberType: z.string().min(1),
    studentId: z.coerce.number().optional(),
    employeeId: z.coerce.number().optional(),
  })
  .superRefine(validateMemberIds);

const bookIssueSchema = z
  .object({
    libraryAddItemId: z.coerce.number().optional(),
    libraryMemberId: z.coerce.number(),
    libraryBookId: z.coerce.number(),
    libraryCreationId: z.coerce.number().optional(),
    genre: z.coerce.number().optional(),
    aisle: z.coerce.number().optional(),
    shelf: z.coerce.number().optional(),
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    issuedBy: z.string().min(1).optional(),
    receivedBy: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!moment(data.issueDate).isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid issueDate",
        path: ["issueDate"],
      });
    }
    if (!moment(data.dueDate).isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid dueDate",
        path: ["dueDate"],
      });
    }
  });

const updateIssueBookSchema = z
  .object({
    libraryIssueBookId: z.coerce.number(),
    status: issueBookStatusEnum,
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    issuedBy: z.string().min(1),
    receivedBy: z.string().min(1).optional(),
    returnDate: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!moment(data.issueDate).isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid issueDate",
        path: ["issueDate"],
      });
    }
    if (!moment(data.dueDate).isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid dueDate",
        path: ["dueDate"],
      });
    }
    if (data.returnDate && !moment(data.returnDate).isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid returnDate",
        path: ["returnDate"],
      });
    }
    if (data.status === "Returned" && !data.returnDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "returnDate is required when status is Returned",
        path: ["returnDate"],
      });
    }
  });

router.post("/", userAuth, validate({ body: addMemberSchema }), addMember);

router.get("/", userAuth, getMemberDetails);

router.get(
  "/single",
  userAuth,
  validate({ query: libraryCreationIdQuerySchema }),
  getSingleMemberDetails,
);

router.patch("/", userAuth, validate({ body: updateMemberSchema }), updateMember);

router.delete(
  "/",
  userAuth,
  validate({ query: libraryMemberIdQuerySchema }),
  deleteMember,
);



router.post("/bookIssue", userAuth, validate({ body: bookIssueSchema }), bookIssue);

router.get("/getAllIssueBook", userAuth, getAllIssueBooks);

router.get(
  "/memberBook",
  userAuth,
  validate({ query: libraryMemberIdQuerySchema }),
  getBookByMemberId,
);

router.patch(
  "/updateStatusBook",
  userAuth,
  validate({ body: updateIssueBookSchema }),
  updateBookAndStatus,
);

router.delete(
  "/deleteBook",
  userAuth,
  validate({ query: libraryIssueBookIdQuerySchema }),
  deleteBook,
);

export default router;
