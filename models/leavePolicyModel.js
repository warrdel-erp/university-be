import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import institute from "./instituteModel.js";

export default sequelize.define(
  "leave_policies",
  {
    policyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "policy_id"
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: { model: universityModel, key: "university_id" }
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: { model: institute, key: "institute_id" }
    },
    policyName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "policy_name"
    },
    totalLeavesPerYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_leaves_per_year"
    },
    maximumNumberOfDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "maximum_number_of_days"
    },
    carryForward: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "carry_forward"
    },
    earnedLeave: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "earned_leave"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by",
      references: { model: users, key: "user_id" }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "updated_by",
      references: { model: users, key: "user_id" }
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    tableName: "leave_policies",
    timestamps: true,
    paranoid: true
  }
);