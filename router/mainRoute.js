import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utility/validation.js';
import { SUBJECT_TYPES, SUBJECT_CATEGORIES } from '../constant.js';
import { getAllCollegesAndCourses, addCampus, addInstitute, addAffiliatedUniversity, addCourse, addSpecialization, addSubject, addClassSections, getClassSections, addSectionSubjectMapper, getSectionSubjectMapper, subjectExcel, updateCourse, changeCourseStatus, getClassSectionSpecific, getClassSectionRecord, updateSubject, getMonthlyIncome } from '../controllers/mainController.js';
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
    affiliatedUniversityId: z.coerce.number().int().positive().optional(),
    term: z.string().min(1).optional(),
    courses: z.array(addCourseItemSchema).min(1, 'courses array is required'),
}).passthrough();

const updateCourseSchema = z.object({
    courseId: positiveIntegerId,
    courseName: z.string().min(1, 'courseName cannot be empty').optional(),
    courseCode: z.string().min(1, 'courseCode cannot be empty').optional(),
    departmentId: positiveIntegerId.nullable().optional(),
    affiliatedUniversityId: positiveIntegerId.nullable().optional(),
}).refine(
    (body) =>
        body.courseName != null
        || body.courseCode != null
        || body.departmentId !== undefined
        || body.affiliatedUniversityId !== undefined,
    { message: 'At least one of courseName, courseCode, departmentId, or affiliatedUniversityId is required' },
);

const changeCourseStatusSchema = z.object({
    courseId: positiveIntegerId,
    isActive: z.boolean({ required_error: 'isActive is required' }),
});

const subjectTypeEnum = z.enum(SUBJECT_TYPES, {
    invalid_type_error: `subjectType must be one of: ${SUBJECT_TYPES.join(', ')}`,
});

const subjectCategoryEnum = z.enum(SUBJECT_CATEGORIES, {
    invalid_type_error: `subjectCategory must be one of: ${SUBJECT_CATEGORIES.join(', ')}`,
});

const addSubjectSchema = z.object({
    courseId: positiveIntegerId,
    specializationId: positiveIntegerId.optional(),
    subjectCode: z.string().min(1, 'subjectCode is required'),
    subjectName: z.string().min(1, 'subjectName is required'),
    subjectType: subjectTypeEnum,
    subjectCategory: subjectCategoryEnum,
    shortName: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    term: z.coerce.number().int().positive().optional(),
});

const updateSubjectSchema = z.object({
    subjectId: positiveIntegerId,
    courseId: positiveIntegerId.optional(),
    subjectCode: z.string().min(1).optional(),
    subjectName: z.string().min(1).optional(),
    shortName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    subjectType: subjectTypeEnum.optional(),
    subjectCategory: subjectCategoryEnum.optional(),
    isActive: z.boolean().optional(),
    specializationId: positiveIntegerId.nullable().optional(),
    term: z.coerce.number().int().positive().nullable().optional(),
}).refine(
    (body) => Object.keys(body).some((key) => key !== 'subjectId'),
    { message: 'At least one field to update is required' },
);

const classSectionRecordQuerySchema = z.object({
    courseId: z.coerce.number({ required_error: 'courseId is required' }).int().positive(),
    classSectionTermId: z.coerce.number({ required_error: 'classSectionTermId is required' }).int().positive(),
});

const addClassSectionsSchema = z.object({
    courseId: positiveIntegerId,
    sessionId: positiveIntegerId,
    section: z.string().trim().min(1, 'section is required'),
    year: z.coerce.number().int().positive('year must be a positive integer'),
}).strict();

const router = Router();

router.get('/all', userAuth, getAllCollegesAndCourses);

router.post('/campus', userAuth, addCampus);

router.post('/institute', userAuth, addInstitute);

router.post('/affiliatedUniversity', userAuth, addAffiliatedUniversity);

router.post('/course', userAuth, validate({ body: addCourseSchema }), addCourse);
router.patch('/course', userAuth, validate({ body: updateCourseSchema }), updateCourse);
router.patch('/course/status', userAuth, validate({ body: changeCourseStatusSchema }), changeCourseStatus);

router.post('/specialization', userAuth, addSpecialization);

router.post('/subject', userAuth, validate({ body: addSubjectSchema }), addSubject);

router.patch('/subject/update', userAuth, validate({ body: updateSubjectSchema }), updateSubject);

// Section master (class table removed)
router.post('/classSections', userAuth, validate({ body: addClassSectionsSchema }), addClassSections);
router.get('/classSections', userAuth, getClassSections);

router.get('/classSectionSpecific', userAuth, getClassSectionSpecific);
router.post('/sectionSubjectMapper', userAuth, addSectionSubjectMapper);
router.get('/sectionSubjectMapper', userAuth, getSectionSubjectMapper);
router.get(
    '/classSectionRecord',
    userAuth,
    validate({ query: classSectionRecordQuerySchema }),
    getClassSectionRecord,
);

router.post('/subjectExcel', userAuth, subjectExcel);

router.get("/monthly-income", getMonthlyIncome);

export default router;