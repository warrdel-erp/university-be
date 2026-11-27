import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import attendancePolicyModel from "./attendancePolicyModel.js";

/**
 * Tab 2: Working Hours, Missing Punch, On-Duty & Regularisation Configuration
 */
const attendancePolicyWorkingHoursModel = sequelize.define(
  "attendance_policy_working_hours",
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
      unique: true,
      field: "policy_id",
      references: {
        model: attendancePolicyModel,
        key: "policy_id",
      },
    },
    // Working Hours Classification (Stored in Minutes)
    minFullDayMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 450, // 7 hr 30 min
      field: "min_full_day_minutes",
    },
    minHalfDayMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 240, // 4 hr 00 min
      field: "min_half_day_minutes",
    },
    considerBreakTime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "consider_break_time",
    },
    // Missing Punch Handling
    missingPunchAction: {
      type: DataTypes.ENUM("PENDING_REVIEW", "TREAT_AS_ABSENT"),
      allowNull: false,
      defaultValue: "PENDING_REVIEW",
      field: "missing_punch_action",
    },
    autoMarkAbsentAfterDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 3,
      field: "auto_mark_absent_after_days",
    },
    // Approved On-Duty Attendance
    countFullDayOdAsPresent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "count_full_day_od_as_present",
    },
    countHalfDayOdAsPresent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "count_half_day_od_as_present",
    },
    requireOdApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "require_od_approval",
    },
    // Attendance Regularisation
    allowRegularisation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "allow_regularisation",
    },
    regularisationWindowDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 7,
      field: "regularisation_window_days",
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
    tableName: "attendance_policy_working_hours",
    timestamps: true,
    paranoid: true,
  }
);

export default attendancePolicyWorkingHoursModel;
