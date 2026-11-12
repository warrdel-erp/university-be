import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leavePolicyRoleModel from "./leavePolicyRoleModel.js";
import userModel from "./userModel.js";

const leavePolicyEmployeeModel = sequelize.define(
  "leave_policy_employees",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    policyRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_role_id",
      references: {
        model: leavePolicyRoleModel,
        key: "id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: userModel,
        key: "user_id",
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
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
    tableName: "leave_policy_employees",
    timestamps: true,
    paranoid: true,
  }
);

leavePolicyEmployeeModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leavePolicyEmployeeModel;

