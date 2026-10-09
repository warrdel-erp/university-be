import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const feePolicyModel = sequelize.define(
  "fee_policy",
  {
    feePolicyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_policy_id",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
    },
    policyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "policy_name",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description",
    },
    appliesTo: {
      type: DataTypes.ENUM("all_components", "selected_components"),
      allowNull: false,
      defaultValue: "selected_components",
      field: "applies_to",
    },
    effect: {
      type: DataTypes.ENUM("reduce_fee", "add_charge", "refund"),
      allowNull: false,
      field: "effect",
    },
    calculationType: {
      type: DataTypes.ENUM(
        "percentage",
        "fixed_amount",
        "per_day",
        "percentage_of_outstanding",
        "slab_based"
      ),
      allowNull: false,
      field: "calculation_type",
    },
    percentageRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "percentage_rate",
    },
    fixedAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "fixed_amount",
    },
    gracePeriodDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "grace_period_days",
    },
    maxCapAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "max_cap_amount",
    },
    referenceDateEvent: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "reference_date_event",
    },
    publishStatus: {
      type: DataTypes.ENUM("draft", "published"),
      allowNull: false,
      defaultValue: "draft",
      field: "publish_status",
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "published_at",
    },
    publishedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "published_by",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by",
    },
  },
  {
    tableName: "fee_policy",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePolicyModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePolicyModel;
