import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import instituteModel from "./instituteModel.js";

const assetCategoryModel = sequelize.define(
  "asset_category",
  {
    assetCategoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "asset_category_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    codePrefix: {
      type: DataTypes.STRING(8),
      allowNull: false,
      field: "code_prefix",
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
    tableName: "asset_categories",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

assetCategoryModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default assetCategoryModel;
