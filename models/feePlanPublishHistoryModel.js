import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import batchModel from "./batchModel.js";

const feePlanPublishHistoryModel = sequelize.define(
  "fee_plan_publish_history",
  {
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
      },
    },
    feePlanPublishHistoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_plan_publish_history_id",
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "batch_id",
      references: {
        model: batchModel,
        key: "batch_id",
      },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM("publish", "unpublish"),
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
  },
  {
    tableName: "fee_plan_publish_history",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  },
);

feePlanPublishHistoryModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default feePlanPublishHistoryModel;
