import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import institute from "./instituteModel.js";

/**
 * Tab 1: Attendance Policy Master & General Settings
 */
const attendancePolicyModel = sequelize.define(
  "attendance_policies",
  {
    policyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "policy_id",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: { model: universityModel, key: "university_id" },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: { model: institute, key: "institute_id" },
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "campus_id",
      references: { model: "campus", key: "campus_id" },
    },
    policyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "policy_name",
    },
    policyCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "policy_code",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description",
    },
    versionNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "v1.0",
      field: "version_number",
    },
    status: {
      type: DataTypes.ENUM("Draft", "Active", "Scheduled", "Archived"),
      allowNull: false,
      defaultValue: "Draft",
      field: "status",
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "effective_from",
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "effective_to",
    },
    applicableSchedule: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "General Shift",
      field: "applicable_schedule",
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
      references: { model: users, key: "user_id" },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "updated_by",
      references: { model: users, key: "user_id" },
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
    tableName: "attendance_policies",
    timestamps: true,
    paranoid: true,
  }
);

attendancePolicyModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default attendancePolicyModel;
