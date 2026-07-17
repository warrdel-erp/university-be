import {Router} from  'express'
const router =  Router();
import {addEvaluation,getAllEvaluation,getSingleEvaluationDetails,updateEvaluation,deleteEvaluation} from "../controllers/evalutionController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), addEvaluation);

router.get('/', userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), getAllEvaluation);

router.get('/single' ,userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), getSingleEvaluationDetails);

router.patch('/' ,userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), updateEvaluation);

router.delete('/' ,userAuth, checkAccess(PERMISSIONS.EVALUATION.value, null), deleteEvaluation);

export default router;