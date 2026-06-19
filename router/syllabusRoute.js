import { Router } from 'express';
import { z } from 'zod';
import {
  addSyllabus,
  getAllSyllabus,
  getSingleSyllabusDetails,
  updateSyllabus,
  deleteSyllabus,
  courseAllSubject,
  addSyllabusUnit,
  syllabusUnitGet,
  updateSyllabusUnit,
  deleteSyllabusUnit,
  semesterAllSubject,
} from '../controllers/syllabusController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';

const router = Router();

const syllabusUnitSlabSchema = z.object({
  unitNumber: z.coerce.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  contactHours: z.string().optional().nullable(),
});

const addSyllabusUnitSchema = z.object({
  subjectId: z.coerce.number({ required_error: 'subjectId is required' }).int().positive(),
  acedmicYearId: z.coerce.number({ required_error: 'acedmicYearId is required' }).int().positive(),
  sessionId: z.coerce.number({ required_error: 'sessionId is required' }).int().positive(),
  semesterId: z.coerce.number().int().positive().optional().nullable(),
  slab: z.array(syllabusUnitSlabSchema).min(1, 'At least one unit is required'),
});

const getSyllabusUnitQuerySchema = z.object({
  acedmicYearId: z.coerce.number({ required_error: 'acedmicYearId is required' }).int().positive(),
  subjectId: z.coerce.number().int().positive().optional(),
  sessionId: z.coerce.number().int().positive().optional(),
  semesterId: z.coerce.number().int().positive().optional(),
});

const updateSyllabusUnitSchema = z
  .object({
    syllabusUnitId: z.coerce
      .number({ required_error: 'syllabusUnitId is required' })
      .int()
      .positive(),
    acedmicYearId: z.coerce.number({ required_error: 'acedmicYearId is required' }).int().positive(),
    unitNumber: z.coerce.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    contactHours: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      data.unitNumber != null ||
      data.name != null ||
      data.description != null ||
      data.contactHours != null,
    { message: 'At least one field to update is required' }
  );

const deleteSyllabusUnitQuerySchema = z.object({
  syllabusUnitId: z.coerce
    .number({ required_error: 'syllabusUnitId is required' })
    .int()
    .positive(),
  acedmicYearId: z.coerce.number({ required_error: 'acedmicYearId is required' }).int().positive(),
});

router.post('/', userAuth, addSyllabus);

router.get('/', userAuth, getAllSyllabus);

router.get('/single', userAuth, getSingleSyllabusDetails);

router.patch('/', userAuth, updateSyllabus);

router.delete('/', userAuth, deleteSyllabus);

router.get('/courseSubject', userAuth, courseAllSubject);

router.post('/addUnit', userAuth, validate({ body: addSyllabusUnitSchema }), addSyllabusUnit);

router.get('/getUnit', userAuth, validate({ query: getSyllabusUnitQuerySchema }), syllabusUnitGet);

router.patch('/unit', userAuth, validate({ body: updateSyllabusUnitSchema }), updateSyllabusUnit);

router.delete(
  '/unit',
  userAuth,
  validate({ query: deleteSyllabusUnitQuerySchema }),
  deleteSyllabusUnit
);

router.get('/semesterSubject', userAuth, semesterAllSubject);

export default router;
