import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import attendancePolicyModel from "./attendancePolicyModel.js";

/**
 * Tab 3: Late Entry, Early Exit, Excessive Lateness & Safeguards Configuration
 */
const attendancePolicyLateEarlyRuleModel = sequelize.define(
  "attendance_policy_late_early_rules",
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
    // Late Entry Rules
    enableLateEntry: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "enable_late_entry",
    },
    lateGracePeriodMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      field: "late_grace_period_minutes",
    },
    lateCountCycle: {
      type: DataTypes.ENUM("CALENDAR_MONTH", "PAY_CYCLE", "WEEKLY"),
      allowNull: false,
      defaultValue: "CALENDAR_MONTH",
      field: "late_count_cycle",
    },
    // Early Exit Rules
    enableEarlyExit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "enable_early_exit",
    },
    earlyGracePeriodMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      field: "early_grace_period_minutes",
    },
    earlyCountCycle: {
      type: DataTypes.ENUM("CALENDAR_MONTH", "PAY_CYCLE", "WEEKLY"),
      allowNull: false,
      defaultValue: "CALENDAR_MONTH",
      field: "early_count_cycle",
    },
    // Violation Counting Strategy
    violationCountingType: {
      type: DataTypes.ENUM("SEPARATE", "COMBINED"),
      allowNull: false,
      defaultValue: "SEPARATE",
      field: "violation_counting_type",
    },
    // Excessive Lateness / Early Exit (One-time penalty for large delays)
    enableExcessiveViolation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "enable_excessive_violation",
    },
    excessiveLateThresholdMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 120,
      field: "excessive_late_threshold_min",
    },
    excessiveLatePenalty: {
      type: DataTypes.ENUM("NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"),
      allowNull: true,
      defaultValue: "HALF_DAY",
      field: "excessive_late_penalty",
    },
    excessiveEarlyThresholdMin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 120,
      field: "excessive_early_threshold_min",
    },
    excessiveEarlyPenalty: {
      type: DataTypes.ENUM("NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"),
      allowNull: true,
      defaultValue: "HALF_DAY",
      field: "excessive_early_penalty",
    },
    // Approved Exceptions & Safeguard
    excludeApprovedExceptions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "exclude_approved_exceptions",
    },
    maxDailyPenaltyDays: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.00,
      field: "max_daily_penalty_days",
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
    tableName: "attendance_policy_late_early_rules",
    timestamps: true,
    paranoid: true,
  }
);

export default attendancePolicyLateEarlyRuleModel;
