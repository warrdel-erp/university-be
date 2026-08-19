import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addBlueprint,
    getAllBlueprints,
    deleteBlueprint,
    addMyBlueprint,
    getMyBlueprints,
    deleteMyBlueprint,
} from "../controllers/questionPaperBlueprintController.js";
import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";
import { questionTypes } from "../constant.js";

// Validation for adding blueprint
const blueprintItemSchema = z.object({
    sectionName: z.string({ required_error: "sectionName is required" }),
    typeOfQuestions: z.enum(Object.values(questionTypes), { required_error: "typeOfQuestions is required" }),
    totalQuestions: z.number({ required_error: "totalQuestions is required" }),
    marksPerQuestion: z.number({ required_error: "marksPerQuestion is required" }),
});

const createBlueprintSchema = z.object({
    name: z.string({ required_error: "name is required" }),
    subjectId: z.number({ required_error: "subjectId is required" }),
    blueprint: z.array(blueprintItemSchema).min(1, "Blueprint must have at least one section"),
});

// Validation for fetching blueprints (optional filter)
const getAllBlueprintsQuerySchema = z.object({
    subjectId: z.coerce.number().optional(),
});

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

// Define routes
router.post("/", userAuth, checkAccess(PERMISSIONS.QUESTION_PAPER_BUILDER_ADD.value, null), validate({ body: createBlueprintSchema }), addBlueprint);

router.post("/my", userAuth, validate({ body: createBlueprintSchema }), addMyBlueprint);

router.get("/", userAuth, checkAccess(PERMISSIONS.QUESTION_PAPER_BUILDER.value, null), validate({ query: getAllBlueprintsQuerySchema }), getAllBlueprints);

router.get("/my", userAuth, validate({ query: getAllBlueprintsQuerySchema }), getMyBlueprints);

router.delete("/my/:id", userAuth, deleteMyBlueprint);

router.delete("/:id", userAuth, checkAccess(PERMISSIONS.QUESTION_PAPER_BUILDER_DELETE.value, null), deleteBlueprint);

export default router;
