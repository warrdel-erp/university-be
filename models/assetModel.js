import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";
import assetCategoryModel from "./assetCategoryModel.js";
import { assetStatuses, assetConditions } from "../constant.js";

const assetModel = sequelize.define(
  "asset",
  {
    assetId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...assetStatuses),
      allowNull: false,
    },
    condition: {
      type: DataTypes.ENUM(...assetConditions),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "asset_category_id",
      references: {
        model: assetCategoryModel,
        key: "asset_category_id",
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
  },
  {
    tableName: "asset",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

assetModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetModel;
