import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import institute from "./instituteModel.js";
import users from "./userModel.js";

const leaveTypeModel = sequelize.define(
  "leave_types",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: { model: universityModel, key: "university_id" },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "institute_id",
      references: { model: institute, key: "institute_id" },
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "campus_id",
      references: { model: "campus", key: "campus_id" },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "name",
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "code",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description",
    },
    classification: {
      type: DataTypes.ENUM("Paid", "Unpaid", "Duty"),
      allowNull: false,
      defaultValue: "Paid",
      field: "classification",
    },
    trackBalance: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "track_balance",
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive", "Draft", "Published"),
      defaultValue: "Draft",
      field: "status",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
      references: { model: users, key: "user_id" },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    tableName: "leave_types",
    timestamps: true,
    paranoid: true,
  }
);

leaveTypeModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default leaveTypeModel;
