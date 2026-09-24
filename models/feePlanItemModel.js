import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import batchModel from "./batchModel.js";

const feePlanItemModel = sequelize.define(
  "fee_plan_item",
  {
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'university_id',
      references: {
        model: universityModel,
        key: 'university_id',
      },
    },
    feePlanItemId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_plan_item_id",
    },
    createDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "create_date",
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "batch_id",
      references: {
        model: batchModel,
        key: "batch_id",
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "year",
      comment: "Programme year level (1, 2, 3...)",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "name",
      comment: "Planned fee receipt label (e.g. Admission / Semester I Fee)",
    },
    academicPeriod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "academic_period",
      comment: "Academic period tag (e.g. Semester I)",
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
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
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
  },
  {
    tableName: "fee_plan_item",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePlanItemModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePlanItemModel;
