import { Router } from 'express';
const router = Router();
import { getSubjectTiny, getAllSubjects } from '../controllers/subjectController.js';
import userAuth from '../middleware/authUser.js';

router.get('/tinyData', userAuth, getSubjectTiny);

router.get('/', userAuth, getAllSubjects);

export default router;
