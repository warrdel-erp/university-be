import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import examinationSessionModel from "./examinationSessionModel.js";
import subjectModel from "./subjectModel.js";
import examScheduleModel from "./examScheduleModel.js";
import users from "./userModel.js";
import gradingModel from "./gradingModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const subjectZScoreCalculationModel = sequelize.define(
  "subject_zscore_calculation",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },
    examinationSessionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "examination_session_id",
      references: {
        model: examinationSessionModel,
        key: "examination_session_id",
      },
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
      },
    },
    examScheduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "exam_schedule_id",
      references: {
        model: examScheduleModel,
        key: "exam_schedule_id",
      },
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "teacher_id",
      references: {
        model: users,
        key: "user_id",
      },
    },
    calculationType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "calculation_type",
      comment: "SUBJECT or TEACHER",
    },
    evaluatedStudentsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "evaluated_students_count",
    },
    classMean: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "class_mean",
    },
    standardDev: {
      type: DataTypes.DECIMAL(6, 4),
      allowNull: true,
      field: "standard_dev",
    },
    gradingId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "grading_id",
      references: {
        model: gradingModel,
        key: "grading_id",
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
    tableName: "subject_zscore_calculation",
    timestamps: true,
    paranoid: false,
  },
);

subjectZScoreCalculationModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default subjectZScoreCalculationModel;

