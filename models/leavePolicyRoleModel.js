import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leavePolicyModel from "./leavePolicyModel.js";
import roleModel from "./roleModel.js";

const leavePolicyRoleModel = sequelize.define(
  "leave_policy_roles",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    policyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_id",
      references: {
        model: leavePolicyModel,
        key: "policy_id",
      },
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "role_id",
      references: {
        model: roleModel,
        key: "role_id",
      },
    },
    assignmentMode: {
      type: DataTypes.ENUM("ALL", "SELECTED"),
      allowNull: false,
      defaultValue: "ALL",
      field: "assignment_mode",
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "effective_from",
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "effective_to",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "campus_id",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "leave_policy_roles",
    timestamps: true,
    paranoid: true,
  }
);

leavePolicyRoleModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leavePolicyRoleModel;

