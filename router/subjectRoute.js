import { Router } from 'express';
const router = Router();
import { getAllSubjects } from '../controllers/subjectController.js';
import userAuth from '../middleware/authUser.js';

router.get('/', userAuth, getAllSubjects);

export default router;
