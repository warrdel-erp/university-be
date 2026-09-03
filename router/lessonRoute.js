import { Router } from 'express';
import { z } from 'zod';

const router = Router();

import {
    addLesson,
    getAllLesson,
    getSingleLessonDetails,
    updateLesson,
    deleteLesson,
    addTopice,
    updateTopic,
    deleteTopic,
    addMapping,
    copyMapping,
    getMapping,
    updateMapping,
    updateCompleteMapping,
    deleteMapping,
    getEmployeeSubjectAndLesson,
    getMyEmployeeSubjectAndLesson,
    getSimpleLessonList,
    linkLessonsToWindow,
    getRoutineByTeacher,
    getMyRoutineByTeacher,
    getMappedLessonProgress,
    getMyMappedLessonProgress,
    addMyLesson,
    getAllMyLessons,
    getMySimpleLessonList,
    getMySingleLessonDetails,
    updateMyLesson,
    deleteMyLesson,
    addMyTopic,
    updateMyTopic,
    deleteMyTopic,
    addMyMapping,
    copyMyMapping,
    getMyMapping,
    updateMyMapping,
    updateMyCompleteMapping,
    deleteMyMapping,
} from "../controllers/lessonController.js";

import { PERMISSIONS } from '../const/permissions.js';
import { checkAccess } from '../middleware/checkAccess.js';

import userAuth from "../middleware/authUser.js";
import { validate } from "../utility/validation.js";

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    positiveIntegerId.optional(),
);

const dateOnly = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const optionalDateOnly = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    dateOnly.optional(),
);

const linkLessonQuerySchema = z.object({
    lessonId: positiveIntegerId,
}).strict();

const linkLessonBodySchema = z.object({
    lectureWindowId: positiveIntegerId,
}).strict();

const copyMappingTargetSchema = z.object({
    timeTableCellDateWiseId: positiveIntegerId,
}).strict();

const copyMappingBodySchema = z.object({
    sourceLessonMappingId: positiveIntegerId,
    targets: z.array(copyMappingTargetSchema).min(1, 'at least one target is required'),
    note: z.string().optional().nullable(),
    lectureUrl: z.string().optional().nullable(),
    file: z.any().optional().nullable(),
}).strict();

const addMappingBodySchema = z.object({
    topicId: positiveIntegerId,
    timeTableCellDateWiseId: optionalPositiveId,
    timeTableCellId: optionalPositiveId,
    date: optionalDateOnly,
    completeDate: dateOnly.optional().nullable(),
    note: z.string().optional().nullable(),
    lectureUrl: z.string().optional().nullable(),
    file: z.any().optional().nullable(),
    status: z.string().optional(),
    subTopic: z.array(z.object({
        name: z.string(),
        description: z.string().optional().nullable(),
    })).optional(),
}).passthrough().refine(
    (data) =>
        data.timeTableCellDateWiseId != null
        || (data.timeTableCellId != null && data.date != null),
    {
        message: 'Provide timeTableCellDateWiseId or timeTableCellId with date',
        path: ['timeTableCellDateWiseId'],
    },
);

const getRoutineByTeacherSchema = z
    .object({
        userId: optionalPositiveId,
        courseId: optionalPositiveId,
        sessionId: optionalPositiveId,
        subjectId: optionalPositiveId,
        date: optionalDateOnly,
    })
    .refine(
        (data) =>
            (data.courseId == null && data.sessionId == null)
            || (data.courseId != null && data.sessionId != null),
        {
            message: 'courseId and sessionId must be sent together',
            path: ['courseId'],
        },
    )
    .refine(
        (data) =>
            data.userId != null
            || data.subjectId != null
            || data.courseId != null,
        {
            message: 'Provide at least one filter: userId, subjectId, or courseId+sessionId',
            path: ['userId'],
        },
    );

const getMyRoutineByTeacherSchema = z
    .object({
        courseId: optionalPositiveId,
        sessionId: optionalPositiveId,
        subjectId: optionalPositiveId,
        date: optionalDateOnly,
    })
    .refine(
        (data) =>
            (data.courseId == null && data.sessionId == null)
            || (data.courseId != null && data.sessionId != null),
        {
            message: 'courseId and sessionId must be sent together',
            path: ['courseId'],
        },
    );

const mappedProgressQuerySchema = z.object({
    userId: positiveIntegerId,
    subjectId: positiveIntegerId,
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
    lessonId: optionalPositiveId,
    status: z.preprocess(
        (val) => (val === '' || val == null ? undefined : val),
        z.string().optional(),
    ),
});

const getMyMappedProgressQuerySchema = z.object({
    subjectId: positiveIntegerId,
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
    lessonId: optionalPositiveId,
    status: z.preprocess(
        (val) => (val === '' || val == null ? undefined : val),
        z.string().optional(),
    ),
});

const updateLessonBodySchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    subjectId: positiveIntegerId.optional(),
    sessionId: positiveIntegerId.optional(),
    userId: positiveIntegerId.optional(),
    lectureWindowId: positiveIntegerId.optional().nullable(),
}).strict();

const updateTopicBodySchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    lessonId: positiveIntegerId.optional(),
}).strict();

const lessonIdParamSchema = z.object({
    lessonId: positiveIntegerId,
}).strict();

const topicIdParamSchema = z.object({
    topicId: positiveIntegerId,
}).strict();

// ---------------------------------------------------------------------------
// 1. Lesson plan — CRUD / list
// ---------------------------------------------------------------------------
router.post('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addLesson);
router.get('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getAllLesson);
router.get('/simple', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSimpleLessonList);
router.get('/single', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getSingleLessonDetails);
router.get('/employee', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getEmployeeSubjectAndLesson);
router.get('/my/employee', userAuth, getMyEmployeeSubjectAndLesson);

router.post('/my', userAuth, addMyLesson);
router.get('/my', userAuth, getAllMyLessons);
router.get('/my/simple', userAuth, getMySimpleLessonList);
router.get('/my/single', userAuth, getMySingleLessonDetails);
router.get(
    '/getRoutineByTeacher',
    userAuth,
    validate({ query: getRoutineByTeacherSchema }),
    getRoutineByTeacher,
);
router.get(
    '/my/getRoutineByTeacher',
    userAuth,
    validate({ query: getMyRoutineByTeacherSchema }),
    getMyRoutineByTeacher,
);
router.get(
    '/mapped',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null),
    validate({ query: mappedProgressQuerySchema }),
    getMappedLessonProgress,
);
router.get(
    '/my/mapped',
    userAuth,
    validate({ query: getMyMappedProgressQuerySchema }),
    getMyMappedLessonProgress,
);

// ---------------------------------------------------------------------------
// 2. Topics
// ---------------------------------------------------------------------------
router.post('/topic', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null), addTopice);
router.patch(
    '/topic/:topicId',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null),
    validate({ params: topicIdParamSchema, body: updateTopicBodySchema }),
    updateTopic,
);
router.delete(
    '/topic/:topicId',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_DELETE.value, null),
    validate({ params: topicIdParamSchema }),
    deleteTopic,
);

router.post('/my/topic', userAuth, addMyTopic);
router.patch(
    '/my/topic/:topicId',
    userAuth,
    validate({ params: topicIdParamSchema, body: updateTopicBodySchema }),
    updateMyTopic,
);
router.delete(
    '/my/topic/:topicId',
    userAuth,
    validate({ params: topicIdParamSchema }),
    deleteMyTopic,
);

// ---------------------------------------------------------------------------
// 3. Mapping — period key = timeTableCellDateWiseId
// ---------------------------------------------------------------------------
router.post(
    '/mapping',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_ADD.value, null),
    validate({ body: addMappingBodySchema }),
    addMapping,
);
router.post(
    '/mapping/copy',
    userAuth,
    validate({ body: copyMappingBodySchema }),
    copyMapping,
);
router.get('/mapping', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER.value, null), getMapping);
router.patch('/', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null), updateMapping);
router.patch('/mapping/:lessonMappingId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null), updateCompleteMapping);
router.delete('/mapping/:lessonMappingId', userAuth, checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_DELETE.value, null), deleteMapping);

router.post(
    '/my/mapping',
    userAuth,
    validate({ body: addMappingBodySchema }),
    addMyMapping,
);
router.post(
    '/my/mapping/copy',
    userAuth,
    validate({ body: copyMappingBodySchema }),
    copyMyMapping,
);
router.get('/my/mapping', userAuth, getMyMapping);
router.patch('/my/mapping', userAuth, updateMyMapping);
router.patch('/my/mapping/:lessonMappingId', userAuth, updateMyCompleteMapping);
router.delete('/my/mapping/:lessonMappingId', userAuth, deleteMyMapping);

// ---------------------------------------------------------------------------
// 4. Lecture window link
// ---------------------------------------------------------------------------
router.post(
    '/link',
    userAuth,
    validate({ query: linkLessonQuerySchema, body: linkLessonBodySchema }),
    linkLessonsToWindow,
);

// ---------------------------------------------------------------------------
// 5. Lesson edit / delete (param routes last so they do not capture named paths)
// ---------------------------------------------------------------------------
router.patch(
    '/my/:lessonId',
    userAuth,
    validate({ params: lessonIdParamSchema, body: updateLessonBodySchema }),
    updateMyLesson,
);
router.delete(
    '/my/:lessonId',
    userAuth,
    validate({ params: lessonIdParamSchema }),
    deleteMyLesson,
);

router.patch(
    '/:lessonId',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_EDIT.value, null),
    validate({ params: lessonIdParamSchema, body: updateLessonBodySchema }),
    updateLesson,
);
router.delete(
    '/:lessonId',
    userAuth,
    checkAccess(PERMISSIONS.LESSON_PLAN_BUILDER_DELETE.value, null),
    validate({ params: lessonIdParamSchema }),
    deleteLesson,
);

export default router;