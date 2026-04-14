import { Router } from 'express';
const router = Router();
import * as examScheduleController from '../controllers/examScheduleController.js';
import userAuth from '../middleware/authUser.js';

router.get('/', userAuth, examScheduleController.getExamSchedules);

router.get('/:id', userAuth, examScheduleController.getExamScheduleById);

export default router;
