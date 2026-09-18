import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import studentHistoricalResultModel from "./studentHistoricalResultModel.js";
import subjectModel from "./subjectModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const studentHistoricalSubjectMarkModel = sequelize.define(
  "student_historical_subject_mark",
  {
    studentHistoricalSubjectMarkId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: "student_historical_subject_mark_id",
    },
    studentHistoricalResultId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "student_historical_result_id",
      references: {
        model: studentHistoricalResultModel,
        key: "student_historical_result_id",
      },
      onDelete: "CASCADE",
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
    examSetupTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "exam_setup_type_id",
      references: {
        model: examSetupTypeModel,
        key: "exam_setup_type_id",
      },
    },
    maxMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      field: "max_marks",
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      field: "obtained_marks",
    },
    weightagePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "weightage_percentage",
    },
    subjectTotalMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "subject_total_marks",
    },
    subjectMaxMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "subject_max_marks",
    },
    grade: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: "grade",
    },
    gradePoint: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      field: "grade_point",
    },
    credits: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      field: "credits",
    },
    isPass: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_pass",
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
    tableName: "student_historical_subject_mark",
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: "unique_historical_result_subject_exam_type",
        fields: ["student_historical_result_id", "subject_id", "exam_setup_type_id"],
      },
    ],
  }
);

studentHistoricalSubjectMarkModel.scopeConfig = {
  university: true,
  institute: true,
};

export default studentHistoricalSubjectMarkModel;
