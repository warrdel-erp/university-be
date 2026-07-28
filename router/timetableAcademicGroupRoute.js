import { Router } from 'express';
import { z } from 'zod';
import userAuth from '../middleware/authUser.js';
import { checkAccess } from '../middleware/checkAccess.js';
import { PERMISSIONS } from '../const/permissions.js';
import { validate } from '../utility/validation.js';
import {
    addStructureScopeMapping,
    getStructureScopeMappings,
    getAllStructureScopeMappings,
    deleteStructureScopeMapping,
    addAcademicGroupRoutine,
    getCascadingGroupRoutines,
    getGroupRoutinesWrappedInStructure,
    deleteAcademicGroupRoutine,
} from '../controllers/timetableAcademicGroupController.js';



const router = Router();

const positiveIntegerId = z.coerce
    .number()
    .int('id must be an integer')
    .positive('id must be greater than 0');

const optionalPositiveId = z.preprocess(
    (val) => (val === '' || val == null ? undefined : val),
    positiveIntegerId.optional(),
);

const addStructureScopeMappingSchema = z
    .object({
        timeTableNameId: positiveIntegerId,
        academicGroupScopeId: positiveIntegerId,
        courseId: optionalPositiveId,
        sessionId: optionalPositiveId,
        startingDate: z.string().min(1, 'startingDate is required'),
        endingDate: z.string().min(1, 'endingDate is required'),
    })
    .refine(
        (data) => new Date(data.endingDate) >= new Date(data.startingDate),
        { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
    );

const getStructureScopeMappingsQuerySchema = z.object({
    timetableStructureCourseMapperId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
    academicGroupScopeId: optionalPositiveId,
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const deleteStructureScopeMappingQuerySchema = z.object({
    timetableStructureCourseMapperId: positiveIntegerId,
});

const addAcademicGroupRoutineSchema = z
    .object({
        timetableStructureCourseMapperId: positiveIntegerId,
        academicGroupId: optionalPositiveId,
        classSectionTermId: optionalPositiveId,
        courseId: optionalPositiveId,
        campusId: optionalPositiveId,
        timeTableType: z.enum(['normal', 'elective']).optional(),
        startingDate: z.string().min(1, 'startingDate is required'),
        endingDate: z.string().min(1, 'endingDate is required'),
        timeTableRoutineId: optionalPositiveId,
        previousDate: z.string().optional(),
    })
    .refine(
        (data) => data.timeTableType === 'elective' || data.academicGroupId != null || data.classSectionTermId != null,
        { message: 'Either academicGroupId or classSectionTermId is required', path: ['academicGroupId'] },
    )
    .refine(
        (data) => new Date(data.endingDate) >= new Date(data.startingDate),
        { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
    );

const getCascadingGroupRoutinesQuerySchema = z.object({
    academicGroupScopeId: optionalPositiveId,
    academicGroupId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const deleteAcademicGroupRoutineQuerySchema = z.object({
    timeTableRoutineId: positiveIntegerId,
});

const getGroupRoutinesWrappedInStructureQuerySchema = z.object({
    academicGroupId: positiveIntegerId,
    sessionId: optionalPositiveId,
});


// ---------------------------------------------------------------------------
// 1. Structure → Scope Mapping APIs
// ---------------------------------------------------------------------------
router.post(
    '/mapping',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP_ADD.value, null),
    validate({ body: addStructureScopeMappingSchema }),
    addStructureScopeMapping,
);

router.get(
    '/mapping',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getStructureScopeMappings,
);

router.get(
    '/allMappings',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getAllStructureScopeMappings,
);

router.get(
    '/mappings',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getAllStructureScopeMappings,
);

router.get(
    '/allScopeMappings',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getAllStructureScopeMappings,
);


router.delete(
    '/mapping',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP_DELETE.value, null),
    validate({ query: deleteStructureScopeMappingQuerySchema }),
    deleteStructureScopeMapping,
);

// ---------------------------------------------------------------------------
// 2. Academic Group Routine APIs
// ---------------------------------------------------------------------------
router.post(
    '/routine',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_CREATE_TIMETABLE.value, null),
    validate({ body: addAcademicGroupRoutineSchema }),
    addAcademicGroupRoutine,
);

router.get(
    '/cascadingRoutine',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getCascadingGroupRoutinesQuerySchema }),
    getCascadingGroupRoutines,
);

router.get(
    '/cascadingGroupRoutines',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getCascadingGroupRoutinesQuerySchema }),
    getCascadingGroupRoutines,
);

router.get(
    '/groupRoutinesWrappedInStructure',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getGroupRoutinesWrappedInStructureQuerySchema }),
    getGroupRoutinesWrappedInStructure,
);

router.get(
    '/routinesWrappedInStructure',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getGroupRoutinesWrappedInStructureQuerySchema }),
    getGroupRoutinesWrappedInStructure,
);

router.get(
    '/groupRoutinesStructure',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getGroupRoutinesWrappedInStructureQuerySchema }),
    getGroupRoutinesWrappedInStructure,
);

router.delete(
    '/routine',

    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_DELETE_ROUTINE.value, null),
    validate({ query: deleteAcademicGroupRoutineQuerySchema }),
    deleteAcademicGroupRoutine,
);

export default router;
