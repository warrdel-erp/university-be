import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import answerSheetQrModel from "./answerSheetQrModel.js";

const answerSheetAnnotationModel = sequelize.define(
  "answer_sheet_annotation",
  {
    answerSheetAnnotationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "answer_sheet_annotation_id",
    },
    answerSheetQrId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "answer_sheet_qr_id",
      references: {
        model: answerSheetQrModel,
        key: "id",
      },
    },
    annotationData: {
      type: DataTypes.JSON,
      allowNull: false,
      field: "annotation_data",
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "version",
    },
    status: {
      type: DataTypes.ENUM("draft", "saved", "submitted"),
      allowNull: false,
      defaultValue: "saved",
      field: "status",
    },
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "acedmic_year_id",
      references: {
        model: acedmicYearModel,
        key: "acedmic_year_id",
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
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "university_id",
      references: {
        model: universityModel,
        key: "university_id",
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by",
      references: {
        model: users,
        key: "user_id",
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by",
      references: {
        model: users,
        key: "user_id",
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
    tableName: "answer_sheet_annotation",
    timestamps: true,
    indexes: [
      {
        name: "idx_answer_sheet_annotation_qr_id",
        fields: ["answer_sheet_qr_id"],
      },
      {
        unique: true,
        name: "unique_answer_sheet_annotation_qr_version",
        fields: ["answer_sheet_qr_id", "version"],
      },
    ],
  },
);

answerSheetAnnotationModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default answerSheetAnnotationModel;
