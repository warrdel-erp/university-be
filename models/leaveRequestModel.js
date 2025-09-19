import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import leavePolicies from "./leavePolicyModel.js";

export default sequelize.define(
  "leave_requests",
  {
    requestId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "request_id"
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "employee_id",
      references: { model: users, key: "user_id" }
    },
    policyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_id",
      references: { model: leavePolicies, key: "policy_id" }
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: "start_date" },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: "end_date" },
    totalDays: { type: DataTypes.INTEGER, allowNull: false, field: "total_days" },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled"),
      defaultValue: "pending"
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "reviewed_by",
      references: { model: users, key: "user_id" }
    },
    reviewedAt: { type: DataTypes.DATE, allowNull: true, field: "reviewed_at" },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      field: "updated_at"
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" }
  },
  { tableName: "leave_requests", timestamps: true, paranoid: true }
);