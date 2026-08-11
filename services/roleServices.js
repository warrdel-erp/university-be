import * as RoleCreationService from "../repository/roleRepository.js";
import * as model from "../models/index.js";
import sequelize from "../database/sequelizeConfig.js";

export async function addRole(RoleData) {
  return RoleCreationService.addRole(RoleData);
}

export async function getRoleDetails() {
  return RoleCreationService.getRoleDetails();
}

export async function getSingleRoleDetails(roleId) {
  return RoleCreationService.getSingleRoleDetails(roleId);
}

export async function deleteRole(RoleSectionId) {
  return RoleCreationService.deleteRole(RoleSectionId);
}

export async function updateRole(roleId, RoleData) {
  return RoleCreationService.updateRole(roleId, RoleData);
}

/**
 * Get all permission+scope mappings for a role template.
 * Returns array of { rolePermissionMappingId, roleId, permission, scope }
 */
export async function getRolePermissions(roleId) {
  const mappings = await model.rolePermissionMappingModel.findAll({
    where: { role_id: roleId },
  });

  const permissionMap = {};
  mappings.forEach(m => {
    const key = `${m.permission}:${m.scope}`;
    if (!permissionMap[key]) {
      permissionMap[key] = {
        rolePermissionMappingId: m.rolePermissionMappingId,
        roleId: m.roleId,
        permission: m.permission,
        scope: m.scope,
        resourceIds: []
      };
    }
    if (m.resourceId) {
      permissionMap[key].resourceIds.push(m.resourceId);
    }
  });

  return Object.values(permissionMap);
}

/**
 * Save role template permission+scope mappings.
 * Replaces all existing mappings for this role.
 * @param {number} roleId 
 * @param {Array<{permission: string, scope: string}>} permissions 
 */
export async function assignRolePermissions(roleId, permissions, transaction = null) {
  const internalTransaction = !transaction ? await sequelize.transaction() : null;
  const activeTransaction = transaction || internalTransaction;

  try {
    // Fetch the role to get its default instituteId
    const roleRecord = await model.roleModel.findOne({
      where: { role_id: roleId },
      transaction: activeTransaction
    });
    const roleInstituteId = roleRecord ? roleRecord.instituteId : null;

    await model.rolePermissionMappingModel.destroy({
      where: { role_id: roleId },
      transaction: activeTransaction
    });

    const dataToInsert = [];
    permissions.forEach(p => {
      let resourceIds = (p.resourceIds && p.resourceIds.length > 0) ? p.resourceIds : [null];
      
      // Fallback: If scope is INSTITUTE and no specific resource was provided, use the role's institute
      if (p.scope === 'INSTITUTE' && resourceIds[0] === null && roleInstituteId) {
        resourceIds = [roleInstituteId];
      }

      resourceIds.forEach(resId => {
        dataToInsert.push({
          roleId,
          permission: p.permission,
          scope: p.scope,
          resourceId: resId
        });
      });
    });

    const result = await model.rolePermissionMappingModel.bulkCreate(dataToInsert, {
      transaction: activeTransaction
    });

    if (internalTransaction) await internalTransaction.commit();
    return result;
  } catch (error) {
    if (internalTransaction) await internalTransaction.rollback();
    throw error;
  }
}
