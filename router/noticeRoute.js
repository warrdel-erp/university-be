import { Router } from 'express';
import { z } from 'zod';
import {
  addNotice,
  getAllStudentNotice,
  getAllEmployeeNotice,
  updateNotice,
  deleteNotice,
} from '../controllers/noticeController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const positiveIntegerId = z.coerce
  .number()
  .int('id must be an integer')
  .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
  (val) => (val === '' || val == null ? undefined : val),
  positiveIntegerId.optional(),
);

const optionalTenantFields = {
  instituteId: optionalPositiveId,
  universityId: optionalPositiveId,
  campusId: optionalPositiveId,
};

const addNoticeSchema = z.object({
  title: z.string().min(1, 'title is required'),
  notice: z.string().optional(),
  noticeDate: z.string().optional(),
  publishDate: z.string().optional(),
  messageTo: z.union([z.array(z.string()), z.string()]),
  role: z.string().optional(),
  ...optionalTenantFields,
}).passthrough();

const noticeListQuerySchema = z.object({
  ...optionalTenantFields,
}).passthrough();

const updateNoticeSchema = z.object({
  noticeId: positiveIntegerId,
  title: z.string().min(1).optional(),
  notice: z.string().optional(),
  noticeDate: z.string().optional(),
  publishDate: z.string().optional(),
  messageTo: z.union([z.array(z.string()), z.string()]).optional(),
  role: z.string().optional(),
  ...optionalTenantFields,
}).passthrough();

const deleteNoticeQuerySchema = z.object({
  noticeId: positiveIntegerId,
  ...optionalTenantFields,
}).passthrough();

router.post('/', userAuth, validate({ body: addNoticeSchema }), addNotice);
router.get('/studentNotice', userAuth, validate({ query: noticeListQuerySchema }), getAllStudentNotice);
router.get('/employee', userAuth, validate({ query: noticeListQuerySchema }), getAllEmployeeNotice);
router.patch('/', userAuth, validate({ body: updateNoticeSchema }), updateNotice);
router.delete('/', userAuth, validate({ query: deleteNoticeQuerySchema }), deleteNotice);

export default router;
