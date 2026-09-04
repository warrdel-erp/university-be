import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import examinationSessionModel from "./examinationSessionModel.js";
import studentModel from "./studentModel.js";
import courseModel from "./courseModel.js";
import sessionModel from "./sessionModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";

const studentResultModel = sequelize.define(
  "student_result",
  {
    studentResultId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: "student_result_id",
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
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "student_id",
      references: {
        model: studentModel,
        key: "student_id",
      },
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "course_id",
      references: {
        model: courseModel,
        key: "course_id",
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "session_id",
      references: {
        model: sessionModel,
        key: "session_id",
      },
    },
    term: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "term",
    },
    totalCredits: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "total_credits",
    },
    earnedCredits: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "earned_credits",
    },
    totalMarks: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "total_marks",
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "obtained_marks",
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "percentage",
    },
    sgpa: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      field: "sgpa",
    },
    cgpa: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      field: "cgpa",
    },
    resultStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "result_status",
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
    academicYearId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    tableName: "student_result",
    timestamps: true,
    paranoid: false,
  },
);

studentResultModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default studentResultModel;
