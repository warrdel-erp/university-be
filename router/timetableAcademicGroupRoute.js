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
    getTimetableList,
    deleteStructureScopeMapping,
    addAcademicGroupRoutine,
    getCascadingGroupRoutines,
    getGroupRoutinesWrappedInStructure,
    getSubjectOptions,
    getProgramsOverview,
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

const optionalCommaSeparatedIds = z.preprocess(
    (val) => {
        if (val === '' || val == null) return undefined;
        return String(val).split(',').map(Number);
    },
    z.array(z.number().int().positive()).optional(),
);

const getStructureScopeMappingsQuerySchema = z.object({
    timetableStructureCourseMapperId: optionalPositiveId,
    timeTableNameId: optionalPositiveId,
    academicGroupScopeId: optionalPositiveId,
    courseId: optionalPositiveId,
    sessionId: optionalPositiveId,
    page: optionalPositiveId,
    limit: optionalPositiveId,
    search: z.string().optional(),
    courseIds: optionalCommaSeparatedIds,
    term: optionalCommaSeparatedIds,
    terms: optionalCommaSeparatedIds,
    timeTableNameIds: optionalCommaSeparatedIds,
    type: z.preprocess(
        (val) => (val === '' || val == null ? undefined : val),
        z.enum(['section', 'academicGroup']).optional(),
    ),
    status: z.preprocess(
        (val) => (val === '' || val == null ? undefined : val),
        z.enum(['In Progress', 'Published']).optional(),
    ),
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
        startingDate: z.string().optional(),
        endingDate: z.string().optional(),
        timeTableRoutineId: optionalPositiveId,
        previousDate: z.string().optional(),
    })
    .refine(
        (data) => data.timeTableType === 'elective' || data.academicGroupId != null || data.classSectionTermId != null,
        { message: 'Either academicGroupId or classSectionTermId is required', path: ['academicGroupId'] },
    )
    .refine(
        (data) => !data.startingDate || !data.endingDate || new Date(data.endingDate) >= new Date(data.startingDate),
        { message: 'endingDate cannot be before startingDate', path: ['endingDate'] },
    );


const getCascadingGroupRoutinesQuerySchema = z.object({
    academicGroupScopeId: optionalPositiveId,
    academicGroupId: optionalPositiveId,
    sessionId: optionalPositiveId,
});

const getGroupRoutinesWrappedInStructureQuerySchema = z.object({
    academicGroupId: positiveIntegerId,
    sessionId: optionalPositiveId,
});

const getSubjectOptionsQuerySchema = z.object({
    classSectionTermId: optionalPositiveId,
    academicGroupId: optionalPositiveId,
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
    '/list',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getTimetableList,
);

router.get(
    '/programsOverview',
    userAuth,
    checkAccess(PERMISSIONS.TIME_TABLE_SETUP.value, null),
    validate({ query: getStructureScopeMappingsQuerySchema }),
    getProgramsOverview,
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



// ---------------------------------------------------------------------------
// 3. Subject Options API
// ---------------------------------------------------------------------------
router.get(
    '/subjectOptions',
    userAuth,
    checkAccess(PERMISSIONS.CREATE_TIME_TABLE_VIEW.value, null),
    validate({ query: getSubjectOptionsQuerySchema }),
    getSubjectOptions,
);

export default router;

