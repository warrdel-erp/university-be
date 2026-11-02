import * as model from "../models/index.js";
import { Op } from "sequelize";
import { SCOPES } from "../const/scopes.js";
import { expandPermissions, getEffectiveScope } from "./permissionUtility.js";
import { getPolicyFilter } from "./policyEngine.js";

/**
 * Centrally resolves a user's permissions for a given active role.
 *  - permissions come from the role (`role_permissions`)
 *  - the scope comes from the role (`role.scope`, clamped to what each permission supports)
 *  - the resources (institute/campus/...) come from the user's assignment of the role
 *    (`user_role_permission_scope.resource_id`)
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

  let role;
  let assignments = [];
  let entries = [];
  try {
    // 1. The user must actually hold this role (one row per resource)
    assignments = await model.userRolePermissionModel.findAll({
      where: { userId, roleId },
      attributes: ['resourceId']
    });
    if (assignments.length === 0) {
      return {};
    }

    role = await model.roleModel.findOne({ where: { roleId }, attributes: ['roleId', 'scope'] });
    if (!role) {
      return {};
    }

    // 2. Permissions belong to the role
    entries = await model.rolePermissionsModel.findAll({
      where: { roleId },
      attributes: ['permission']
    });
  } catch (error) {
    console.error(`[authEngine] Error fetching permissions for userId: ${userId}, roleId: ${roleId}`, error);
    throw error;
  }

  // 3. Build permission map: role scope + the resources chosen for this user
  const resourceIds = assignments.map(a => a.resourceId).filter(id => id !== null && id !== undefined);
  const permissionMap = {};
  entries.forEach(e => {
    const scopeKey = getEffectiveScope(e.permission, role.scope);
    const targets = role.scope === SCOPES.UNIVERSITY
      ? (scopeKey === SCOPES.MY ? [userId] : 'ALL')
      : (scopeKey === SCOPES.MY ? [userId] : (scopeKey === role.scope ? [...resourceIds] : []));
    permissionMap[e.permission] = {
      permissionKey: e.permission,
      scopeKey,
      resourceIds: targets
    };
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
  [SCOPES.MY]: async (userId) => {
    return [userId];
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
    MY: 'userId',
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  employee: {
    MY: 'userId',
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  leaveRequest: {
    MY: 'userId',
    DEPARTMENT: 'userId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  attendance: {
    DEPARTMENT: 'departmentId',
    INSTITUTE: 'instituteId',
    CAMPUS: 'campusId'
  },
  default: {
    MY: 'userId',
    DEPARTMENT: 'departmentId',
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
  let targets = perm.resourceIds;

  if (targets === 'ALL' || scope === SCOPES.UNIVERSITY) {
    targets = 'ALL';
  } else if (scope === SCOPES.MY) {
    targets = [user.userId];
  } else if (!targets || (Array.isArray(targets) && targets.length === 0)) {
    const resolver = scopeResolvers[scope];
    if (resolver) {
      targets = await resolver(user.userId);
    }
  }

  // Delegate entirely to policyEngine.js
  let filter = getPolicyFilter(scope, targets, user, permissionKey);
  if (targets === 'ALL' && filter === null) {
    filter = {};
  }

  const data = { filter, scope };

  return data;
}
