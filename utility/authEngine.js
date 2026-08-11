import * as model from "../models/index.js";
import { Op } from "sequelize";
import { SCOPES } from "../const/scopes.js";
import { expandPermissions } from "./permissionUtility.js";
import { getPolicyFilter } from "./policyEngine.js";

/**
 * Centrally resolves a user's permissions for a given active role.
 * Queries the single `user_role_permission_scope` table directly.
 * User can access only one role's permissions at a time (active/selected role).
 * Automatically expands implied permissions using `dependentOn`.
 *
 * @param {number} userId - The user's ID
 * @param {number} roleId - The active role ID
 * @returns {Promise<Array<{permissionKey: string, scopeKey: string}>>} Resolved permission-scope list
 */
export async function getUserPermissions(userId, roleId) {
  if (!roleId) {
    return [];
  }

  // 2. Query user_role_permission_scope for this user + role
  const entries = await model.userRolePermissionModel.findAll({
    where: { userId, roleId },
    attributes: ['permission', 'scope', 'resourceId']
  });

  // 3. Build permission map (grouping multiple resourceIds)
  const permissionMap = {};
  entries.forEach(e => {
    if (!permissionMap[e.permission]) {
      permissionMap[e.permission] = {
        permissionKey: e.permission,
        scopeKey: e.scope,
        resourceIds: []
      };
    }
    if (e.resourceId) {
      permissionMap[e.permission].resourceIds.push(e.resourceId);
    }
  });

  // 4. Expand permissions based on 'dependentOn'
  const expandedArray = expandPermissions(Object.values(permissionMap));
  const resultObj = {};
  for (const p of expandedArray) {
    resultObj[p.permissionKey] = p;
  }
  return resultObj;
}

/**
 * Pluggable Scope Resolvers
 * Each resolver takes a userId and returns an array of allowed IDs for that scope,
 * or 'ALL' if it grants global access.
 */
export const scopeResolvers = {
  [SCOPES.OWN]: async (userId) => {
    return [userId];
  },

  [SCOPES.CLASS]: async (userId) => {
    // Resolve classSectionIds mapped to teacher
    const mappings = await model.teacherSectionMappingModel.findAll({
      where: { userId }
    });
    return mappings.map(m => m.classSectionsId);
  },

  [SCOPES.DEPARTMENT]: async (userId) => {
    const heads = await model.userDepartmentPositionsModel.findAll({
      where: { userId, status: 'ACTIVE' },
      attributes: ['userDepartmentPositionId', 'departmentPositionId'],
      include: [
        {
          model: model.departmentPositionsModel,
          as: 'position',
          attributes: ['departmentPositionId', 'departmentId'],
          required: true,
          where: { departmentId: { [Op.ne]: null } },
        },
      ],
    });

    const departmentIds = [];
    for (const head of heads) {
      const departmentId = head.position.departmentId;
      if (!departmentIds.includes(departmentId)) {
        departmentIds.push(departmentId);
      }
    }
    return departmentIds;
  },

  [SCOPES.INSTITUTE]: async (userId) => {
    const employee = await model.employeeModel.findOne({ where: { userId } });
    return employee ? [employee.instituteId] : [];
  },

  [SCOPES.CAMPUS]: async (userId) => {
    const employee = await model.employeeModel.findOne({ where: { userId } });
    return employee ? [employee.campusId] : [];
  },

  [SCOPES.UNIVERSITY]: async (userId) => {
    return 'ALL';
  }
};

// Resource field mapping configurations
const resourceScopeFields = {
  student: {
    OWN: 'userId',
    CLASS: 'class_sections_id',
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  employee: {
    OWN: 'userId',
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  leaveRequest: {
    OWN: 'userId',
    DEPARTMENT: 'userId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId' // Assuming leave request might have campusId or falls back
  },
  attendance: {
    CLASS: 'class_sections_id',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  default: {
    OWN: 'userId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId',
    UNIVERSITY: "universityId"
  }
};

/**
 * Centralized authorization engine filter builder.
 * Generates the Sequelize where condition for a resource query.
 *
 * @param {object} user - The requesting user object (req.user)
 * @param {string} permissionKey - The required permission key
 * @param {number} activeRoleId - The role ID passed down from middleware
 * @returns {Promise<{filter: Object, scope: string|null}>} Object containing the filter and scope
 */
export async function getAccessFilter(user, permissionKey, activeRoleId) {
  const roleId = activeRoleId || user.defaultRoleId;
  const permissions = await getUserPermissions(user.userId, roleId);

  const perm = permissions[permissionKey];
  if (!perm) {
    // Return a filter that resolves to nothing if permission is denied
    return { filter: { id: -1 }, scope: null };
  }

  const scope = perm.scopeKey;
  let targets = perm.resourceIds || [];

  // Delegate entirely to policyEngine.js
  const filter = getPolicyFilter(scope, targets, user, permissionKey);

  return { filter, scope };
}
