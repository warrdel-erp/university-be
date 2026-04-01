import { Router } from "express";
import { z } from "zod";
const router = Router();
import {
    addBlueprint,
    getAllBlueprints,
    deleteBlueprint,
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
    subjectId: z.number({ required_error: "subjectId is required" }),
    blueprint: z.array(blueprintItemSchema).min(1, "Blueprint must have at least one section"),
});

// Validation for fetching blueprints (optional filter)
const getAllBlueprintsQuerySchema = z.object({
    subjectId: z.coerce.number().optional(),
});

// Define routes
router.post("/", userAuth, validate({ body: createBlueprintSchema }), addBlueprint);

router.get("/", userAuth, validate({ query: getAllBlueprintsQuerySchema }), getAllBlueprints);

router.delete("/:id", userAuth, deleteBlueprint);

export default router;
