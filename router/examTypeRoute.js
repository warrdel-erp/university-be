import { Router } from 'express'
const router = Router();
import { addExamType, getAllExamType, getSingleExamType, updateExamType, deleteExamType } from "../controllers/examTypeController.js";
import userAuth from "../middleware/authUser.js"

import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";

router.post('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_ADD.value, null), addExamType);

router.get('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES.value, null), getAllExamType);

router.get('/single', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES.value, null), getSingleExamType);

router.patch('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_EDIT.value, null), updateExamType);

router.delete('/', userAuth, checkAccess(PERMISSIONS.EXAM_TYPES_DELETE.value, null), deleteExamType);

export default router;