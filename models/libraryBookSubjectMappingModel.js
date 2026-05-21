import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import libraryBookModel from "./libraryBookModel.js";
import subjectModel from "./subjectModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
  "library_book_subject_mappings",
  {
    librarySubjectMappingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "library_subject_mapping_id",
    },
    librarySubjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "library_subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
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
    tableName: "library_book_subject_mappings",
    timestamps: false,
    paranoid: false,
  },
);
