import * as model from "../models/index.js";
import { QueryTypes } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import { scoped } from "../utility/scoped.js";

export async function addRole(RoleData) {
  try {
    return scoped(model.roleModel).create(RoleData);
  } catch (error) {
    console.error("Error in add Role :", error);
    throw error;
  }
}

export async function getRoleDetails() {
  try {
    return scoped(model.roleModel).findAll({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    });
  } catch (error) {
    console.error("Error fetching Role details:", error);
    throw error;
  }
}

export async function getSingleRoleDetails(roleId) {
  try {
    return scoped(model.roleModel).findOne({
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      where: { roleId },
    });
  } catch (error) {
    console.error("Error fetching Role details:", error);
    throw error;
  }
}

export async function findStudentRoleId() {
  const roles = await scoped(model.roleModel).findAll({
    attributes: ["roleId", "role"],
  });
  for (const row of roles) {
    const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
    const name = String(plain.role ?? "").trim().toUpperCase();
    if (name === "STUDENT") return plain.roleId;
  }
  return null;
}

export async function findRoleByRoleName(roleName) {
  const rows = await sequelize.query(
    `SELECT role_id AS roleId, role
     FROM role
     WHERE role = CONVERT(:roleName USING latin1)
       AND deleted_at IS NULL
     LIMIT 1`,
    { replacements: { roleName }, type: QueryTypes.SELECT }
  );
  return rows[0] ?? null;
}

export async function deleteRole(roleId) {
  const existing = await scoped(model.roleModel).findOne({
    attributes: ["roleId"],
    where: { roleId },
  });
  if (!existing) {
    return false;
  }

  const deleted = await scoped(model.roleModel).destroy({ where: { roleId } });
  return deleted > 0;
}

export async function updateRole(roleId, RoleData) {
  try {
    const existing = await scoped(model.roleModel).findOne({
      attributes: ["roleId"],
      where: { roleId },
    });
    if (!existing) {
      return [0];
    }

    return scoped(model.roleModel).update(RoleData, { where: { roleId } });
  } catch (error) {
    console.error(`Error updating Role creation ${roleId}:`, error);
    throw error;
  }
}
