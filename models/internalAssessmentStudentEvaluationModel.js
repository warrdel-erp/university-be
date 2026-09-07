import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import internalAssessmentModel from "./internalAssessmentModel.js";
import studentModel from "./studentModel.js";

const internalAssessmentStudentEvaluationModel = sequelize.define(
  "internal_assessment_student_evaluation",
  {
    internalAssessmentStudentEvaluationId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "internal_assessment_student_evaluation_id",
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    internalAssessmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "internal_assessment_id",
      references: {
        model: internalAssessmentModel,
        key: "internal_assessment_id",
      },
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "obtained_marks",
    },
    documentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "document_url",
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
      allowNull: true,
      field: "institute_id",
      references: {
        model: instituteModel,
        key: "institute_id",
      },
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
    tableName: "internal_assessment_student_evaluation",
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: "unique_student_internal_assessment",
        fields: ["student_id", "internal_assessment_id"],
      },
    ],
  }
);

internalAssessmentStudentEvaluationModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default internalAssessmentStudentEvaluationModel;
