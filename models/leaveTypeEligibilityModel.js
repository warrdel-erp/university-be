import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leaveTypeModel from "./leaveTypeModel.js";

const leaveTypeEligibilityModel = sequelize.define(
  "leave_type_eligibility",
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
    allowDuringProbation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_during_probation",
    },
    minServiceRequirement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "min_service_requirement",
    },
    allowHalfDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "allow_half_day",
    },
    minLeaveDuration: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0.5,
      field: "min_leave_duration",
    },
    maxConsecutiveDays: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: "max_consecutive_days",
    },
    maxDaysPerApplication: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: "max_days_per_application",
    },
    advanceNoticeMin: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: "advance_notice_min",
    },
    backdatedApplication: {
      type: DataTypes.STRING(50),
      defaultValue: "Allowed with Limit",
      field: "backdated_application",
    },
    backdatedLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: "backdated_limit",
    },
    futureApplicationLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: "future_application_limit",
    },
    requireSupportingDoc: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "require_supporting_doc",
    },
    docRequirementRule: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "doc_requirement_rule",
    },
    docRequiredAfterDays: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      field: "doc_required_after_days",
    },
    acceptedDocTypes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "accepted_doc_types",
    },
    combinationRule: {
      type: DataTypes.STRING(50),
      defaultValue: "No Restriction",
      field: "combination_rule",
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
    tableName: "leave_type_eligibility",
    timestamps: true,
    paranoid: true,
  }
);

leaveTypeEligibilityModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leaveTypeEligibilityModel;
