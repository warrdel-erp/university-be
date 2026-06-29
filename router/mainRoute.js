import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utility/validation.js';
import { getAllCollegesAndCourses, addCampus, addInstitute, addAffiliatedUniversity, addCourse, addSpecialization, addSubject, addClass, getClass, addClassSubjectMapper, getClassSubjectMapper, addSemester, getSemester, createClass, subjectExcel, updateCourse, changeCourseStatus, getClassSpecific, getClassRecord, updateSubject, getMonthlyIncome } from '../controllers/mainController.js';
import userAuth from '../middleware/authUser.js'

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const addCourseItemSchema = z.object({
    courseName: z.string().min(1, 'courseName is required'),
    courseCode: z.string().min(1, 'courseCode is required'),
    departmentId: positiveIntegerId.optional(),
    capacity: z.union([z.string(), z.number()]).optional(),
    courseDuration: z.coerce.number().positive().optional(),
    term: z.string().min(1).optional(),
}).passthrough();

const addCourseSchema = z.object({
    course_levelId: z.coerce.number().int().positive('course_levelId is required'),
    departmentId: positiveIntegerId.optional(),
    acedmicYearId: z.coerce.number().int().positive().optional(),
    affiliatedUniversityId: z.coerce.number().int().positive().optional(),
    term: z.string().min(1).optional(),
    courses: z.array(addCourseItemSchema).min(1, 'courses array is required'),
}).passthrough();

const updateCourseSchema = z.object({
    courseId: positiveIntegerId,
    courseName: z.string().min(1, 'courseName cannot be empty').optional(),
    courseCode: z.string().min(1, 'courseCode cannot be empty').optional(),
    departmentId: positiveIntegerId.nullable().optional(),
}).refine(
    (body) => body.courseName != null || body.courseCode != null || body.departmentId !== undefined,
    { message: 'At least one of courseName, courseCode, or departmentId is required' },
);

const changeCourseStatusSchema = z.object({
    courseId: positiveIntegerId,
    isActive: z.boolean({ required_error: 'isActive is required' }),
});

const classRecordQuerySchema = z.object({
    courseId: z.coerce.number({ required_error: 'courseId is required' }).int().positive(),
    classSectionsId: z.coerce.number().int().positive().optional(),
    classSectionId: z.coerce.number().int().positive().optional(),
    semesterId: z.coerce.number().int().positive().optional(),
    acedmicYearId: z.coerce.number().int().positive().optional(),
}).refine(
    (query) => query.classSectionsId != null || query.classSectionId != null,
    { message: 'classSectionsId is required' },
);

const router = Router();

router.get('/all', userAuth, getAllCollegesAndCourses);

router.post('/campus', userAuth, addCampus);

router.post('/institute', userAuth, addInstitute);

router.post('/affiliatedUniversity', userAuth, addAffiliatedUniversity);

router.post('/course', userAuth, validate({ body: addCourseSchema }), addCourse);
router.patch('/course', userAuth, validate({ body: updateCourseSchema }), updateCourse);
router.patch('/course/status', userAuth, validate({ body: changeCourseStatusSchema }), changeCourseStatus);

router.post('/specialization', userAuth, addSpecialization);

router.post('/subject', userAuth, addSubject);

router.patch('/subject/update', userAuth, updateSubject);

router.post('/class', userAuth, addClass);

router.get('/class', userAuth, getClass);

router.get('/classSpecific', userAuth, getClassSpecific);

router.post('/classSubjectMapper', userAuth, addClassSubjectMapper);

router.get('/classSubjectMapper', userAuth, getClassSubjectMapper);

router.post('/semester', userAuth, addSemester);

router.get('/semester', userAuth, getSemester);

router.post('/createClass', userAuth, createClass);

router.post('/subjectExcel', userAuth, subjectExcel);

router.get(
    '/classRecord',
    userAuth,
    validate({ query: classRecordQuerySchema }),
    getClassRecord,
);

router.get("/monthly-income", getMonthlyIncome);

export default router;