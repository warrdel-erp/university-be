import { Router } from 'express';
import { z } from 'zod';
const router = Router();
import {
    addEvaluation,
    getAllEvaluation,
    getMyEvaluation,
    getSingleEvaluationDetails,
    updateEvaluation,
    deleteEvaluation,
} from "../controllers/evalutionController.js";
import userAuth from "../middleware/authUser.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from "../utility/validation.js";

const numberId = z.coerce.number();

const getEvaluationQuerySchema = z.object({
    examSetupTypeId: z.preprocess(
        (val) => (val === "" || val == null ? undefined : val),
        numberId.optional(),
    ),
});

router.post('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), addEvaluation);

router.get('/my', userAuth, checkAccess(PERMISSIONS.TEACHER_EVALUATION.value, null), validate({ query: getEvaluationQuerySchema }), getMyEvaluation);

router.get('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), validate({ query: getEvaluationQuerySchema }), getAllEvaluation);

router.get('/single', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), getSingleEvaluationDetails);

router.patch('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), updateEvaluation);

router.delete('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), deleteEvaluation);

export default router;
