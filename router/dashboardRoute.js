import { Router } from 'express';
import { z } from 'zod';
import { getDashboard } from '../controllers/dashboardController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const dashboardQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  week: z.coerce.number().int().min(1).max(53).optional(),
});

router.get('/', userAuth, validate({ query: dashboardQuerySchema }), getDashboard);

export default router;
