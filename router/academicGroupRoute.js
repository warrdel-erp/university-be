import { Router } from 'express';
import { z } from 'zod';
import * as academicGroupController from '../controllers/academicGroupController.js';
import userAuth from '../middleware/authUser.js';
import { validate } from '../utility/validation.js';
import {
    ACADEMIC_GROUP_TYPES,
    ACADEMIC_GROUP_SELECTION_SCOPES,
    ACADEMIC_GROUP_CONTEXT_TYPES,
    ACADEMIC_GROUP_PUBLISH_STATUSES,
    ACADEMIC_GROUP_USER_ROLES,
} from '../constant.js';

const router = Router();

const emptyToUndefined = (val) =>
    val === '' || val === null || val === undefined || val === 'undefined' ? undefined : val;

const positiveIntegerId = z.coerce
    .number({ invalid_type_error: 'id must be a number' })
    .int({ message: 'id must be an integer' })
    .positive({ message: 'id must be positive' });

const optionalPositiveIntegerId = z.preprocess(
    emptyToUndefined,
    positiveIntegerId.optional(),
);

const optionalNullablePositiveIntegerId = z.preprocess(
    emptyToUndefined,
    positiveIntegerId.nullable().optional(),
);

const optionalString = z.preprocess(
    emptyToUndefined,
    z.string().trim().optional(),
);

/** Single id or list: `4`, `4,5`, repeated query keys */
const optionalPositiveIntegerIdList = z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'undefined') {
        return undefined;
    }
    const rawItems = Array.isArray(val) ? val : String(val).split(',');
    const ids = [];
    for (const item of rawItems) {
        if (item === '' || item == null) {
            continue;
        }
        ids.push(item);
    }
    return ids.length > 0 ? ids : undefined;
}, z.array(positiveIntegerId).min(1).optional());

const groupTypeEnum = z.enum(ACADEMIC_GROUP_TYPES);
const selectionScopeEnum = z.enum(ACADEMIC_GROUP_SELECTION_SCOPES);
const contextTypeEnum = z.enum(ACADEMIC_GROUP_CONTEXT_TYPES);
const publishStatusEnum = z.enum(ACADEMIC_GROUP_PUBLISH_STATUSES);
const userRoleEnum = z.enum(ACADEMIC_GROUP_USER_ROLES);

const createScopeSchema = z.object({
    groupType: groupTypeEnum,
    title: z.string({ required_error: 'title is required' }).trim().min(1),
    selectionScope: selectionScopeEnum,
    courseId: optionalNullablePositiveIntegerId,
    sessionId: optionalNullablePositiveIntegerId,
    term: optionalNullablePositiveIntegerId,
    academicContextType: contextTypeEnum,
    contextSubjectId: optionalNullablePositiveIntegerId,
    activityName: optionalString.nullable(),
});

const updateScopeSchema = z.object({
    academicGroupScopeId: positiveIntegerId,
    groupType: groupTypeEnum.optional(),
    title: z.string().trim().min(1).optional(),
    selectionScope: selectionScopeEnum.optional(),
    courseId: optionalNullablePositiveIntegerId,
    sessionId: optionalNullablePositiveIntegerId,
    term: optionalNullablePositiveIntegerId,
    academicContextType: contextTypeEnum.optional(),
    contextSubjectId: optionalNullablePositiveIntegerId,
    activityName: optionalString.nullable(),
});

const scopeIdQuerySchema = z.object({
    academicGroupScopeId: positiveIntegerId,
});

const listScopesQuerySchema = z.object({
    search: optionalString,
});

const createGroupSchema = z.object({
    academicGroupScopeId: positiveIntegerId,
    groupName: z.string({ required_error: 'groupName is required' }).trim().min(1),
    groupCode: optionalString.nullable(),
    capacity: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int().positive().nullable().optional(),
    ),
    publishStatus: publishStatusEnum.optional(),
});

const updateGroupSchema = z.object({
    academicGroupId: positiveIntegerId,
    groupName: z.string().trim().min(1).optional(),
    groupCode: optionalString.nullable(),
    capacity: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int().positive().nullable().optional(),
    ),
    publishStatus: publishStatusEnum.optional(),
});

const publishGroupSchema = z.object({
    academicGroupId: positiveIntegerId,
});

const groupIdQuerySchema = z.object({
    academicGroupId: positiveIntegerId,
});

const listGroupsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: optionalString,
    courseId: optionalPositiveIntegerId,
    sessionId: optionalPositiveIntegerId,
    term: optionalPositiveIntegerId,
    groupType: groupTypeEnum.optional(),
    publishStatus: publishStatusEnum.optional(),
});

const userItemSchema = z.object({
    userId: positiveIntegerId,
    role: userRoleEnum,
});

const addUsersSchema = z.union([
    z.object({
        academicGroupId: positiveIntegerId,
        users: z.array(userItemSchema).min(1),
    }),
    z.object({
        academicGroupId: positiveIntegerId,
        userId: positiveIntegerId,
        role: userRoleEnum,
    }),
]);

const updateUserSchema = z.object({
    academicGroupUserId: positiveIntegerId,
    role: userRoleEnum,
});

const deleteUsersSchema = z.union([
    z.object({
        academicGroupUserId: positiveIntegerId,
    }),
    z.object({
        academicGroupId: positiveIntegerId,
        userId: positiveIntegerId,
    }),
]);

const addStudentsSchema = z.object({
    academicGroupId: positiveIntegerId,
    studentIds: z.array(positiveIntegerId).min(1),
});

const availableStudentsQuerySchema = z.object({
    academicGroupId: positiveIntegerId,
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: optionalString,
    classSectionsId: optionalPositiveIntegerId,
    year: optionalPositiveIntegerId,
    /** One or many terms, e.g. `1` or `1,2,3,4,5`. Default = scope.term, else all terms on course/session sections. */
    term: optionalPositiveIntegerIdList,
    academicYearId: optionalPositiveIntegerId,
});

const deleteStudentsSchema = z.union([
    z.object({
        academicGroupStudentId: positiveIntegerId,
    }),
    z.object({
        academicGroupId: positiveIntegerId,
        studentIds: z.array(positiveIntegerId).min(1),
    }),
]);

router.post(
    '/scope',
    userAuth,
    validate({ body: createScopeSchema }),
    academicGroupController.createScope,
);

router.get(
    '/scope/all',
    userAuth,
    validate({ query: listScopesQuerySchema }),
    academicGroupController.getAllScopes,
);

router.get(
    '/scope/single',
    userAuth,
    validate({ query: scopeIdQuerySchema }),
    academicGroupController.getScopeSingle,
);

router.patch(
    '/scope',
    userAuth,
    validate({ body: updateScopeSchema }),
    academicGroupController.updateScope,
);

router.delete(
    '/scope',
    userAuth,
    validate({ query: scopeIdQuerySchema }),
    academicGroupController.deleteScope,
);

router.post(
    '/',
    userAuth,
    validate({ body: createGroupSchema }),
    academicGroupController.createGroup,
);

router.get(
    '/all',
    userAuth,
    validate({ query: listGroupsQuerySchema }),
    academicGroupController.getAllGroups,
);

router.get(
    '/single',
    userAuth,
    validate({ query: groupIdQuerySchema }),
    academicGroupController.getGroupSingle,
);

router.patch(
    '/',
    userAuth,
    validate({ body: updateGroupSchema }),
    academicGroupController.updateGroup,
);

router.patch(
    '/publish',
    userAuth,
    validate({ body: publishGroupSchema }),
    academicGroupController.publishGroup,
);

router.delete(
    '/',
    userAuth,
    validate({ query: groupIdQuerySchema }),
    academicGroupController.deleteGroup,
);

router.post(
    '/user',
    userAuth,
    validate({ body: addUsersSchema }),
    academicGroupController.addUsers,
);

router.get(
    '/user',
    userAuth,
    validate({ query: groupIdQuerySchema }),
    academicGroupController.getGroupUsers,
);

router.patch(
    '/user',
    userAuth,
    validate({ body: updateUserSchema }),
    academicGroupController.updateUser,
);

router.delete(
    '/user',
    userAuth,
    validate({ body: deleteUsersSchema }),
    academicGroupController.deleteUsers,
);

router.post(
    '/student',
    userAuth,
    validate({ body: addStudentsSchema }),
    academicGroupController.addStudents,
);

router.get(
    '/availableStudents',
    userAuth,
    validate({ query: availableStudentsQuerySchema }),
    academicGroupController.getAvailableStudents,
);

router.delete(
    '/student',
    userAuth,
    validate({ body: deleteStudentsSchema }),
    academicGroupController.deleteStudents,
);

export default router;
