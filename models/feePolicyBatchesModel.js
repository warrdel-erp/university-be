import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import feePolicyModel from "./feePolicyModel.js";
import batchModel from "./batchModel.js";

const feePolicyBatchesModel = sequelize.define(
  "fee_policy_batches",
  {
    feePolicyBatchId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_policy_batch_id",
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
    feePolicyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "fee_policy_id",
      references: {
        model: feePolicyModel,
        key: "fee_policy_id",
      },
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
      allowNull: true,
      field: "year",
      comment: "Programme year level (1, 2, 3...)",
    },
  },
  {
    tableName: "fee_policy_batches",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feePolicyBatchesModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default feePolicyBatchesModel;
