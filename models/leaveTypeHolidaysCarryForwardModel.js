import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leaveTypeModel from "./leaveTypeModel.js";

const leaveTypeHolidaysCarryForwardModel = sequelize.define(
  "leave_type_holidays_carry_forward",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    leaveTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: "leave_type_id",
      references: {
        model: leaveTypeModel,
        key: "id",
      },
    },
    applySandwichRule: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "apply_sandwich_rule",
    },
    sandwichWeeklyOffs: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "sandwich_weekly_offs",
    },
    sandwichPublicHolidays: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "sandwich_public_holidays",
    },
    unusedLeaveAction: {
      type: DataTypes.STRING(50),
      defaultValue: "Carry to Next Period",
      field: "unused_leave_action",
    },
    allowYearEndCarryForward: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_year_end_carry_forward",
    },
    carryForwardCalcType: {
      type: DataTypes.STRING(50),
      defaultValue: "Percentage of Unused Balance",
      field: "carry_forward_calc_type",
    },
    carryForwardPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      field: "carry_forward_percentage",
    },
    transferCap: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      field: "transfer_cap",
    },
    maxAccumulatedBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: "max_accumulated_balance",
    },
    expiryAfterMonths: {
      type: DataTypes.STRING(50),
      defaultValue: "After 12 months",
      field: "expiry_after_months",
    },
    allowNegativeBalance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_negative_balance",
    },
    maxNegativeBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "max_negative_balance",
    },
    requireAdditionalApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "require_additional_approval",
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
    tableName: "leave_type_holidays_carry_forward",
    timestamps: true,
    paranoid: true,
  }
);

leaveTypeHolidaysCarryForwardModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leaveTypeHolidaysCarryForwardModel;
