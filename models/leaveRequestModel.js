import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import leavePolicies from "./leavePolicyModel.js";

const leaveRequestModel = sequelize.define(
  "leave_requests",
  {
    requestId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "request_id"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
                model: users,
                key: 'user_id'
            }
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'university_id',
      references: { model: 'university', key: 'university_id' }
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'campus_id',
      references: { model: 'campus', key: 'campus_id' }
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'institute_id',
      references: { model: 'institute', key: 'institute_id' }
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'department_id',
      references: { model: 'department', key: 'department_id' }
    },
    policyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_id",
      references: { model: leavePolicies, key: "policy_id" }
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date"
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date"
    },
    totalDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_days"
    },
    reason:
    {
      type: DataTypes.TEXT,
      allowNull: true
    },
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
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reviewed_at"
    },
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

leaveRequestModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leaveRequestModel;
