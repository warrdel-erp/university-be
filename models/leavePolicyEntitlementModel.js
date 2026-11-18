import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import leavePolicyModel from "./leavePolicyModel.js";

const leavePolicyEntitlementModel = sequelize.define(
  "leave_policy_entitlements",
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
        model: leavePolicyModel,
        key: "policy_id",
      },
    },
    leaveTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "leave_type_id",
    },
    customLeaveName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "custom_leave_name",
    },
    annualEntitlement: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "annual_entitlement",
    },
    entitlementUnit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "Days",
      field: "entitlement_unit",
    },
    onJoiningRule: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "on_joining_rule",
    },
    onSeparationRule: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "on_separation_rule",
    },
    roundingRule: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "rounding_rule",
    },
    distributionFrequency: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "distribution_frequency",
    },
    distributionMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "distribution_method",
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
