import { Router } from "express";
import { z } from "zod";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import {
    addTeacherSubstitute,
    getTeacherSubstitutes,
    getTeacherSubstituteById,
    updateTeacherSubstitute,
    deleteTeacherSubstitute,
} from "../controllers/teacherSubstituteController.js";

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int("id must be an integer")
    .positive("id must be greater than 0");

const createTeacherSubstituteSchema = z.object({
    employeeId: positiveIntegerId,
    substituteEmployeeId: positiveIntegerId,
    userId: positiveIntegerId.optional(),
});

const updateTeacherSubstituteSchema = z.object({
    teacherSubstituteId: positiveIntegerId,
    substituteEmployeeId: positiveIntegerId.optional(),
    userId: positiveIntegerId.optional(),
}).refine(
    (data) => data.substituteEmployeeId != null || data.userId != null,
    { message: "At least one of substituteEmployeeId or userId is required" },
);

const teacherSubstituteIdQuerySchema = z.object({
    teacherSubstituteId: positiveIntegerId,
});

const listQuerySchema = z.object({
    employeeId: positiveIntegerId.optional(),
});

router.post("/", userAuth, validate({ body: createTeacherSubstituteSchema }), addTeacherSubstitute);

router.get("/", userAuth, validate({ query: listQuerySchema }), getTeacherSubstitutes);

router.get(
    "/single",
    userAuth,
    validate({ query: teacherSubstituteIdQuerySchema }),
    getTeacherSubstituteById,
);

router.patch("/", userAuth, validate({ body: updateTeacherSubstituteSchema }), updateTeacherSubstitute);

router.delete(
    "/",
    userAuth,
    validate({ query: teacherSubstituteIdQuerySchema }),
    deleteTeacherSubstitute,
);

export default router;
