import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import libraryBookModel from "./libraryBookModel.js";
import libraryCategoryModel from "./libraryCategoryModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
  "library_book_category_mappings",
  {
    libraryCategoryMappingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_category_mapping_id",
    },
    libraryCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_category_id",
      references: {
        model: libraryCategoryModel,
        key: "library_category_id",
      },
    },
    libraryBookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_book_id",
      references: {
        model: libraryBookModel,
        key: "library_book_id",
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
    tableName: "library_book_category_mappings",
    timestamps: false,
    paranoid: false,
  },
);
