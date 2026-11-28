import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import attendancePolicyModel from "./attendancePolicyModel.js";
import role from "./roleModel.js";
import department from "./departmentModel.js";
import employee from "./employeeModel.js";
import users from "./userModel.js";

/**
 * Tab 1: Policy Applicability Mappings (Roles / Categories, Departments, Employees)
 */
const attendancePolicyMappingModel = sequelize.define(
  "attendance_policy_mappings",
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
        model: attendancePolicyModel,
        key: "policy_id",
      },
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "role_id",
      references: {
        model: role,
        key: "role_id",
      },
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "department_id",
      references: {
        model: department,
        key: "department_id",
      },
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "employee_id",
      references: {
        model: users,
        key: "user_id",
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by",
      references: {
        model: users,
        key: "user_id",
      },
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
    tableName: "attendance_policy_mappings",
    timestamps: true,
    paranoid: true,
  }
);

export default attendancePolicyMappingModel;
