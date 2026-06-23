import { Router } from 'express';
import { z } from 'zod';
import userAuth from '../middleware/authUser.js';
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

const optionalAcademicYearId = optionalPositiveId;

const getRoutineSchema = z.object({
    classSectionsId: positiveIntegerId,
});

const getRoutineByTeacherSchema = z.object({
    employeeId: positiveIntegerId,
    courseId: positiveIntegerId,
    sessionId: positiveIntegerId,
    acedmicYearId: optionalAcademicYearId,
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
    acedmicYearId: optionalAcademicYearId,
});

const getTimeTableByCourseAndSectionQuerySchema = z.object({
    courseId: positiveIntegerId,
    classSectionsId: optionalPositiveId,
    timeTableType: z.string().optional(),
    acedmicYearId: optionalAcademicYearId,
});

const addTimeTableCreateSchema = z.object({
    timeTableNameId: optionalPositiveId,
    courseId: optionalPositiveId,
    acedmicYearId: optionalAcademicYearId,
    classSectionsId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
    startingDate: z.string().optional(),
    endingDate: z.string().optional(),
    timeTableRoutineId: optionalPositiveId,
    previousDate: z.string().optional(),
});

const changeTimeTableCreateSchema = z.object({
    timeTableRoutineId: positiveIntegerId,
    startingDate: z.string().optional(),
    endingDate: z.string().optional(),
    classSectionsId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
    courseId: optionalPositiveId,
    campusId: optionalPositiveId,
    timeTableType: z.enum(['normal', 'elective']).optional(),
    acedmicYearId: optionalAcademicYearId,
});

const addTimeTableMappingSchema = z.object({
    timeTableRoutineId: optionalPositiveId,
    timeTableCreationId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
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
    acedmicYearId: optionalAcademicYearId,
});

const getTimeTableMappingBodySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
    acedmicYearId: optionalAcademicYearId,
});

const updateTimeTableMappingSchema = z.object({
    timeTableMappingId: positiveIntegerId,
    timeTableType: z.enum(['normal', 'elective']),
});

const updateTeacherMappingItemSchema = z.object({
    timeTableMappingId: optionalPositiveId,
    employeeId: optionalPositiveId,
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
});

const getTimeTableCellDataQuerySchema = z.object({
    courseId: positiveIntegerId,
    classSectionsId: optionalPositiveId,
    acedmicYearId: optionalAcademicYearId,
});

const getTimeTableElectiveQuerySchema = z.object({
    courseId: positiveIntegerId,
    acedmicYearId: optionalAcademicYearId,
});

const publishTimeTableQuerySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
    acedmicYearId: optionalAcademicYearId,
});

const classSubjectCountQuerySchema = z.object({
    classSectionsId: positiveIntegerId,
    acedmicYearId: optionalAcademicYearId,
});

router.get('/getRoutine', userAuth, validate({ query: getRoutineSchema }), getRoutineByClassSectionId);
router.get('/getRoutineByTeacher', userAuth, validate({ query: getRoutineByTeacherSchema }), getRoutineByTeacherAndAcademicYear);
router.post('/', userAuth, validate({ body: addTimeTableCreateSchema }), addtimeTableCreate);
router.post('/clone', userAuth, validate({ body: cloneRoutineSchema }), cloneTimeTableRoutine);
router.get('/', userAuth, validate({ query: z.object({ acedmicYearId: optionalAcademicYearId }) }), gettimeTableCreateDetails);
router.get('/single', userAuth, validate({ query: getSingleQuerySchema }), getSingletimeTableCreateDetails);
router.get('/create', userAuth, validate({ query: getTimeTableByCourseAndSectionQuerySchema }), getTimeTableByCourseAndSection);
router.patch('/create', userAuth, validate({ body: changeTimeTableCreateSchema }), changeTimeTableCreate);
router.post('/mapping', userAuth, validate({ body: addTimeTableMappingSchema }), addtimeTableMapping);
router.get('/mapping', userAuth, validate({ body: getTimeTableMappingBodySchema }), getTimeTableMappingDetail);
router.get('/single/mapping', userAuth, validate({ query: getSingleQuerySchema }), getSingletimeTableMappingDetail);
router.patch('/mapping', userAuth, validate({ body: updateTimeTableMappingSchema }), updatetimeTableCreate);
router.patch('/mapping/update-create', userAuth, validate({ body: updateSimpleTeacherMappingSchema }), updateSimpleTeacherMappingController);
router.delete('/mapping', userAuth, validate({ query: deleteTimeTableMappingQuerySchema }), deletetimeTableMapping);
router.get('/cellData', userAuth, validate({ query: getTimeTableCellDataQuerySchema }), getTimeTableCellData);
router.get('/elective', userAuth, validate({ query: getTimeTableElectiveQuerySchema }), getTimeTableElective);
router.patch('/publish', userAuth, validate({ query: publishTimeTableQuerySchema }), publishTimeTable);
router.get('/subjectCount', userAuth, validate({ query: classSubjectCountQuerySchema }), ClassSubjectCount);

export default router;
