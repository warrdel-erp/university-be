import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import attendancePolicyModel from "./attendancePolicyModel.js";

/**
 * Tab 3: Repeated Late Entry & Early Exit Impact Slabs / Tiers
 */
const attendancePolicyPenaltySlabModel = sequelize.define(
  "attendance_policy_penalty_slabs",
  {
    slabId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "slab_id",
    },
    policyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "policy_id",
      references: {
        model: attendancePolicyModel,
        key: "policy_id",
      },
    },
    violationType: {
      type: DataTypes.ENUM("LATE_ENTRY", "EARLY_EXIT", "COMBINED"),
      allowNull: false,
      field: "violation_type",
    },
    fromOccurrence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "from_occurrence",
    },
    toOccurrence: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL means "Onwards"
      field: "to_occurrence",
    },
    attendanceImpact: {
      type: DataTypes.ENUM("NO_IMPACT", "HALF_DAY", "FULL_DAY", "LOP"),
      allowNull: false,
      defaultValue: "NO_IMPACT",
      field: "attendance_impact",
    },
    penaltyApplication: {
      type: DataTypes.ENUM("AT_THRESHOLD", "EVERY_OCCURRENCE"),
      allowNull: false,
      defaultValue: "AT_THRESHOLD",
      field: "penalty_application",
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
    tableName: "attendance_policy_penalty_slabs",
    timestamps: true,
    paranoid: true,
  }
);

export default attendancePolicyPenaltySlabModel;
