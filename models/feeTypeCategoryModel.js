import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";

const feeTypeCategoryModel = sequelize.define(
  "fee_type_category",
  {
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'university_id',
      references: {
        model: universityModel,
        key: 'university_id'
      }
    },
    feeTypeCategoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "fee_type_category_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "fee_type_categories",
    charset: "latin1",
    collate: "latin1_swedish_ci",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

feeTypeCategoryModel.scopeConfig = { university: true, institute: false, academicYear: false };

export default feeTypeCategoryModel;
