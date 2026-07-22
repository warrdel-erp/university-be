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
    , deleteTimeTableRoutine, getDateWiseCellsBySection, updateDateWiseCellTeacherController
    , updateDateWiseCellSubjectController, updateDateWiseCellRoomController
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
    subjectId: optionalPositiveId,
});

const cloneRoutineSchema = z
    .object({
        previousRoutineId: positiveIntegerId,
        startingDate: z.string().min(1),
        endingDate: z.string().min(1),
        previousDate: z.string().min(1).optional(),
    })
    .refine((data) => new Date(data.endingDate) >= new Date(data.startingDate), {
        message: 'endingDate cannot be before startingDate',
        path: ['endingDate'],
    })
    .refine(
        (data) =>
            data.previousDate == null
            || new Date(data.previousDate) < new Date(data.startingDate),
        {
            message: 'previousDate must be before startingDate',
            path: ['previousDate'],
        },
    );

const getSingleQuerySchema = z.object({
    courseId: optionalPositiveId,
});

const getTimeTableCreateListQuerySchema = z.object({
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const getTimeTableByCourseAndSectionQuerySchema = z.object({
    courseId: positiveIntegerId,
    classSectionTermId: optionalPositiveId,
    timeTableType: z.string().optional(),
}).refine(
    (data) => data.timeTableType === 'elective' || data.classSectionTermId != null,
    { message: 'classSectionTermId is required', path: ['classSectionTermId'] },
);

const addTimeTableCreateSchema = z.object({
    timetableStructureCourseMapperId: positiveIntegerId,
    classSectionTermId: optionalPositiveId,
    courseId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
    startingDate: z.string().min(1, 'startingDate is required'),
    endingDate: z.string().min(1, 'endingDate is required'),
    timeTableRoutineId: optionalPositiveId,
    previousDate: z.string().optional(),
}).refine(
    (data) => data.timeTableType === 'elective' || data.classSectionTermId != null,
    { message: 'classSectionTermId is required', path: ['classSectionTermId'] },
).refine(
    (data) => new Date(data.endingDate) >= new Date(data.startingDate),
    { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
);

const changeTimeTableCreateSchema = z.object({
    timeTableRoutineId: positiveIntegerId,
    startingDate: z.string().optional(),
    endingDate: z.string().optional(),
    classSectionTermId: optionalPositiveId,
    timetableStructureCourseMapperId: optionalPositiveId,
    courseId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
});

const updatePeriodItemSchema = z.object({
    timeTableCreationId: positiveIntegerId,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    periodName: z.string().optional(),
    isCourse: z.boolean().optional(),
    isBreak: z.boolean().optional(),
    type: z.enum(['Automatic', 'Manual']).optional(),
});

const updatePeriodsSchema = z.array(updatePeriodItemSchema).min(1, 'request body must be a non-empty array');

const patchTimeTableCreateSchema = z.union([
    updatePeriodsSchema,
    changeTimeTableCreateSchema,
]);

const mappingSlotSchema = z.object({
    timeTableCreationId: positiveIntegerId,
    period: z.coerce.number().int().positive('period must be greater than 0'),
});

const mappingBodySchema = z.object({
    timeTableRoutineId: optionalPositiveId,
    timeTableCreationId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
    userId: optionalPositiveId,
    employeeId: optionalPositiveId,
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

    sourceTimeTableCellId: optionalPositiveId,
    copyTarget: z.enum(['nextPeriod', 'nextDay']).optional(),
});

const addTimeTableMappingSchema = mappingBodySchema.superRefine((body, ctx) => {
    const isCopy = body.sourceTimeTableCellId != null;
    const hasSlots = Array.isArray(body.slots) && body.slots.length > 0;
    const hasCell = body.timeTableRoutineId != null
        && body.timeTableCreationId != null
        && body.period != null;

    if (isCopy && body.copyTarget == null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'copyTarget is required when sourceTimeTableCellId is sent (nextPeriod | nextDay)',
            path: ['copyTarget'],
        });
    }

    if (!isCopy && !hasSlots && !hasCell) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Send sourceTimeTableCellId+copyTarget, slots[], or timeTableRoutineId with timeTableCreationId and period',
            path: ['timeTableRoutineId'],
        });
    }
});

const getTimeTableMappingBodySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
});

const updateTimeTableMappingSchema = z.object({
    timeTableCellId: positiveIntegerId,
    timeTableType: z.enum(['normal', 'elective']),
});

const updateTeacherMappingItemSchema = z.object({
    timeTableCellId: optionalPositiveId,
    timeTableCellTeacherId: optionalPositiveId,
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
    .refine((items) => items[0]?.timeTableCellId != null, {
        message: 'Base row must contain timeTableCellId',
        path: [0, 'timeTableCellId'],
    })
    .refine(
        (items) => items.every((item) => item.isNew !== true || item.userId != null),
        { message: 'userId is required when isNew is true' },
    );

const deleteTimeTableMappingQuerySchema = z.object({
    timeTableCellId: positiveIntegerId,
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

const deleteTimeTableRoutineQuerySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
});

const classSubjectCountQuerySchema = z.object({
    classSectionTermId: positiveIntegerId,
});

const getDateWiseCellsQuerySchema = z.object({
    courseId: positiveIntegerId,
    sessionId: positiveIntegerId,
    classSectionTermId: positiveIntegerId,
    date: z.string().optional(),
});

const updateDateWiseTeacherSchema = z.object({
    timeTableCellDateWiseId: positiveIntegerId,
    userId: positiveIntegerId,
});

const updateDateWiseSubjectSchema = z.object({
    timeTableCellDateWiseId: positiveIntegerId,
    subjectId: optionalPositiveId,
    electiveSubjectId: optionalPositiveId,
}).refine(
    (body) => body.subjectId != null || body.electiveSubjectId != null,
    { message: 'subjectId or electiveSubjectId is required', path: ['subjectId'] },
);

const updateDateWiseRoomSchema = z.object({
    timeTableCellDateWiseId: positiveIntegerId,
    classRoomSectionId: positiveIntegerId,
});

// ---------------------------------------------------------------------------
// 1. Read / bootstrap — structure selection and routine lookup
// ---------------------------------------------------------------------------
router.get('/', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getTimeTableCreateListQuerySchema }), gettimeTableCreateDetails);

router.get('/single', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getSingleQuerySchema }), getSingletimeTableCreateDetails);
router.get('/create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getTimeTableByCourseAndSectionQuerySchema }),
    getTimeTableByCourseAndSection);
router.get('/getRoutine', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getRoutineSchema }), getRoutineByClassSectionId);
router.get('/getRoutineByTeacher', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getRoutineByTeacherSchema }), getRoutineByTeacherAndAcademicYear);

router.get('/dateWiseCells', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getDateWiseCellsQuerySchema }), getDateWiseCellsBySection);
router.patch('/dateWiseCells/teacher', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: updateDateWiseTeacherSchema }), updateDateWiseCellTeacherController);
router.patch('/dateWiseCells/subject', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: updateDateWiseSubjectSchema }), updateDateWiseCellSubjectController);
router.patch('/dateWiseCells/room', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: updateDateWiseRoomSchema }), updateDateWiseCellRoomController);

// ---------------------------------------------------------------------------
// 2. Routine lifecycle — create / update / clone / publish
// ---------------------------------------------------------------------------
router.post('/', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_CREATE_TIMETABLE.value, null), validate({ body: addTimeTableCreateSchema }), addtimeTableCreate);
router.patch('/create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: patchTimeTableCreateSchema }), changeTimeTableCreate);
router.delete('/', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_DELETE_ROUTINE.value, null), validate({ query: deleteTimeTableRoutineQuerySchema }), deleteTimeTableRoutine);
router.post('/clone', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_CREATE_TIMETABLE.value, null), validate({ body: cloneRoutineSchema }), cloneTimeTableRoutine);
router.patch('/publish', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ query: publishTimeTableQuerySchema }), publishTimeTable);

// ---------------------------------------------------------------------------
// 3. Mapping lifecycle — assign timetable cells / teachers
// ---------------------------------------------------------------------------
router.post('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_CREATE_TIMETABLE.value, null), validate({ body: addTimeTableMappingSchema }), addtimeTableMapping);

router.get('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ body: getTimeTableMappingBodySchema }), getTimeTableMappingDetail);
router.get('/single/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getSingleQuerySchema }), getSingletimeTableMappingDetail);
router.patch('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: updateTimeTableMappingSchema }), updatetimeTableCreate);
router.patch('/mapping/update-create', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_EDIT_ROUTINE.value, null), validate({ body: updateSimpleTeacherMappingSchema }), updateSimpleTeacherMappingController);
router.delete('/mapping', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_DELETE_ROUTINE.value, null), validate({ query: deleteTimeTableMappingQuerySchema }), deletetimeTableMapping);

// ---------------------------------------------------------------------------
// 4. Grid helpers / reporting
// ---------------------------------------------------------------------------
router.get('/cellData', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getTimeTableCellDataQuerySchema }), getTimeTableCellData);
router.get('/elective', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: getTimeTableElectiveQuerySchema }), getTimeTableElective);
router.get('/subjectCount', userAuth, checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null), validate({ query: classSubjectCountQuerySchema }), ClassSubjectCount);

export default router;
