import { Router } from 'express';
import { z } from 'zod';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from "../middleware/checkAccess.js";
import { PERMISSIONS } from "../const/permissions.js";
import { validate } from '../utility/validation.js';
import {
    addtimeTableCreate, cloneTimeTableRoutine, gettimeTableCreateDetails, getSingletimeTableCreateDetails, addtimeTableMapping, getTimeTableMappingDetail, getSingletimeTableMappingDetail, getTimeTableCellData
    , updatetimeTableCreate, getTimeTableElective, publishTimeTable, updateSimpleTeacherMappingController
    , deletetimeTableMapping, ClassSubjectCount, changeTimeTableCreate, getTimeTableByCourseAndSection, getRoutineByClassSectionId, getRoutineByTeacherAndAcademicYear
} from '../controllers/timeTableCreateController.js';

const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    positiveIntegerId.optional()
);

const getRoutineSchema = z.object({
    classSectionTermId: positiveIntegerId,
});

const getRoutineByTeacherSchema = z.object({
    userId: positiveIntegerId,
    courseId: positiveIntegerId,
    sessionId: positiveIntegerId,
});

const cloneRoutineSchema = z
    .object({
        previousRoutineId: positiveIntegerId,
        startingDate: z.string().min(1),
        endingDate: z.string().min(1),
    })
    .refine((data) => new Date(data.endingDate) >= new Date(data.startingDate), {
        message: 'endingDate cannot be before startingDate',
        path: ['endingDate'],
    });

const getSingleQuerySchema = z.object({
    courseId: optionalPositiveId,
});

const getTimeTableCreateListQuerySchema = z.object({
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const getTimeTableByCourseAndSectionQuerySchema = z.object({
    courseId: positiveIntegerId,
    classSectionTermId: positiveIntegerId,
    timeTableType: z.string().optional(),
});

const addTimeTableCreateSchema = z.object({
    timeTableNameId: positiveIntegerId,
    classSectionTermId: optionalPositiveId,
    courseId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
    startingDate: z.string().optional(),
    endingDate: z.string().optional(),
    timeTableRoutineId: optionalPositiveId,
    previousDate: z.string().optional(),
}).refine(
    (data) => data.timeTableType === 'elective' || data.classSectionTermId != null,
    { message: 'classSectionTermId is required', path: ['classSectionTermId'] },
);

const changeTimeTableCreateSchema = z.object({
    timeTableRoutineId: positiveIntegerId,
    startingDate: z.string().optional(),
    endingDate: z.string().optional(),
    classSectionTermId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
    courseId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
});

const mappingSlotSchema = z.object({
    timeTableCreationId: positiveIntegerId,
    period: z.coerce.number().int().positive('period must be greater than 0'),
});

const addTimeTableMappingSchema = z
    .object({
        timeTableRoutineId: positiveIntegerId,
        timeTableCreationId: optionalPositiveId,
        timeTableNameId: optionalPositiveId,
        userId: optionalPositiveId,
        subjectId: optionalPositiveId,
        electiveSubjectId: optionalPositiveId,
        teacherSubjectMappingId: optionalPositiveId,
        day: z.string().optional(),
        period: z.coerce.number().int().optional(),
        classRoomSectionId: optionalPositiveId,
        timeTableType: z.enum(['normal', 'elective']).optional(),
        isSameTeacher: z.boolean().optional(),
        teacherType: z.string().optional(),
        isAttendence: z.boolean().optional(),
        isOverridingSyblingElectives: z.boolean().optional(),
        classSectionTermId: optionalPositiveId,
        classSectionTermIds: z.array(positiveIntegerId).min(1).optional(),
        slots: z.array(mappingSlotSchema).min(1).optional(),
        combinedGroupId: z.string().uuid().optional(),
    })
    .refine(
        (body) => (Array.isArray(body.slots) && body.slots.length > 0)
            || (body.timeTableCreationId != null && body.period != null),
        {
            message: 'Provide slots[] or both timeTableCreationId and period',
            path: ['slots'],
        },
    );

const getTimeTableMappingBodySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
});

const updateTimeTableMappingSchema = z.object({
    timeTableMappingId: positiveIntegerId,
    timeTableType: z.enum(['normal', 'elective']),
});

const updateTeacherMappingItemSchema = z.object({
    timeTableMappingId: optionalPositiveId,
    userId: optionalPositiveId,
    subjectId: optionalPositiveId,
    electiveSubjectId: optionalPositiveId,
    teacherType: z.string().optional(),
    isAttendence: z.boolean().optional(),
    isOverridingSyblingElectives: z.boolean().optional(),
    isNew: z.boolean().optional(),
});

const updateSimpleTeacherMappingSchema = z
    .array(updateTeacherMappingItemSchema)
    .min(1, 'request body must be a non-empty array')
    .refine((items) => items[0]?.timeTableMappingId != null, {
        message: 'Base row must contain timeTableMappingId',
        path: [0, 'timeTableMappingId'],
    });

const deleteTimeTableMappingQuerySchema = z.object({
    timeTableMappingId: positiveIntegerId,
    deleteCombinedGroup: z
        .preprocess((val) => val === 'true' || val === true, z.boolean())
        .optional(),
});

const getTimeTableCellDataQuerySchema = z.object({
    courseId: positiveIntegerId,
    classSectionTermId: positiveIntegerId,
});

const getTimeTableElectiveQuerySchema = z.object({
    courseId: positiveIntegerId,
});

const publishTimeTableQuerySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
});

const classSubjectCountQuerySchema = z.object({
    classSectionTermId: positiveIntegerId,
});

router.get('/getRoutine', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getRoutineSchema }), getRoutineByClassSectionId);
router.get('/getRoutineByTeacher', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getRoutineByTeacherSchema }), getRoutineByTeacherAndAcademicYear);
router.post('/', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_ADD.value, null), validate({ body: addTimeTableCreateSchema }), addtimeTableCreate);
router.post('/clone', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_ADD.value, null), validate({ body: cloneRoutineSchema }), cloneTimeTableRoutine);
router.get('/', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getTimeTableCreateListQuerySchema }), gettimeTableCreateDetails);
router.get('/single', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getSingleQuerySchema }), getSingletimeTableCreateDetails);
router.get('/create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getTimeTableByCourseAndSectionQuerySchema }), getTimeTableByCourseAndSection);
router.patch('/create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT.value, null), validate({ body: changeTimeTableCreateSchema }), changeTimeTableCreate);
router.post('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_ADD.value, null), validate({ body: addTimeTableMappingSchema }), addtimeTableMapping);
router.get('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ body: getTimeTableMappingBodySchema }), getTimeTableMappingDetail);
router.get('/single/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getSingleQuerySchema }), getSingletimeTableMappingDetail);
router.patch('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT.value, null), validate({ body: updateTimeTableMappingSchema }), updatetimeTableCreate);
router.patch('/mapping/update-create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT.value, null), validate({ body: updateSimpleTeacherMappingSchema }), updateSimpleTeacherMappingController);
router.delete('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_DELETE.value, null), validate({ query: deleteTimeTableMappingQuerySchema }), deletetimeTableMapping);
router.get('/cellData', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getTimeTableCellDataQuerySchema }), getTimeTableCellData);
router.get('/elective', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: getTimeTableElectiveQuerySchema }), getTimeTableElective);
router.patch('/publish', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT.value, null), validate({ query: publishTimeTableQuerySchema }), publishTimeTable);
router.get('/subjectCount', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE.value, null), validate({ query: classSubjectCountQuerySchema }), ClassSubjectCount);

export default router;
