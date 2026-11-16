import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leavePolicyModel from "./leavePolicyModel.js";

const leavePolicyEntitlementModel = sequelize.define(
  "leave_policy_entitlements",
  {
    entitlementId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "entitlement_id",
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
    leaveType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "leave_type",
    },
    leaveCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "leave_code",
    },
    entitlementAnnual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "entitlement_annual",
    },
    creditMethod: {
      type: DataTypes.ENUM("Monthly", "Yearly", "Quarterly"),
      allowNull: false,
      defaultValue: "Monthly",
      field: "credit_method",
    },
    carryForward: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "carry_forward",
    },
    maxCarryForwardDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "max_carry_forward_days",
    },
    maximumConsecutiveDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "maximum_consecutive_days",
    },
    keyRules: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "key_rules",
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Configured",
      field: "status",
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
    tableName: "leave_policy_entitlements",
    timestamps: true,
    paranoid: true,
  }
);

leavePolicyEntitlementModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default leavePolicyEntitlementModel;

