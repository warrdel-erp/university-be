import { Router } from 'express'
const router = Router();
import { addExamType, getAllExamType, getSingleExamType, updateExamType, deleteExamType } from "../controllers/examTypeController.js";
import userAuth from "../middleware/authUser.js"

router.post('/', userAuth, addExamType);

router.get('/', userAuth, getAllExamType);

router.get('/single', userAuth, getSingleExamType);

router.patch('/', userAuth, updateExamType);

router.delete('/', userAuth, deleteExamType);

export default router;