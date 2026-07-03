import { Router } from 'express';
import { z } from 'zod';
import { getDashboardOverview, getFeeOverview, getStudentAttendanceOverview, getTodaysClasses, getDashboardNotices } from '../controllers/dashboardController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const overviewQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const feeOverviewQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  week: z.coerce.number().int().min(1).max(53).optional(),
});

const todaysClassesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const noticesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/overview', userAuth, validate({ query: overviewQuerySchema }), getDashboardOverview);
router.get('/fee-overview', userAuth, validate({ query: feeOverviewQuerySchema }), getFeeOverview);
router.get('/student-analytics', userAuth, getStudentAttendanceOverview);
router.get('/todays-classes', userAuth, validate({ query: todaysClassesQuerySchema }), getTodaysClasses);
router.get('/notices', userAuth, validate({ query: noticesQuerySchema }), getDashboardNotices);

export default router;
