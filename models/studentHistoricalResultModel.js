import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import studentModel from "./studentModel.js";
import curriculumBatchTermMappingModel from "./curriculumBatchTermMappingModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";

const studentHistoricalResultModel = sequelize.define(
  "student_historical_result",
  {
    studentHistoricalResultId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: "student_historical_result_id",
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
    // Single foreign key that connects to curriculumId, batch, and term
    curriculumBatchTermMappingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "curriculum_batch_term_mapping_id",
      references: {
        model: curriculumBatchTermMappingModel,
        key: "curriculum_batch_term_mapping_id",
      },
    },
    totalCredits: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "total_credits",
    },
    earnedCredits: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: "earned_credits",
    },
    totalMarks: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: "total_marks",
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(8, 2),
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
      type: DataTypes.ENUM("PASS", "PROMOTED_WITH_ATKT", "FAIL", "WITHHELD"),
      allowNull: true,
      defaultValue: "PASS",
      field: "result_status",
    },
    freezeStatus: {
      type: DataTypes.ENUM("DRAFT", "VALIDATED", "FROZEN", "SUBMITTED"),
      allowNull: false,
      defaultValue: "DRAFT",
      field: "freeze_status",
    },
    isFrozen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_frozen",
    },
    frozenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "frozen_at",
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
      allowNull: true,
      field: "acedmic_year_id",
      references: {
        model: acedmicYearModel,
        key: "acedmic_year_id",
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
  },
  {
    tableName: "student_historical_result",
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: "unique_student_batch_term_historical",
        fields: ["student_id", "curriculum_batch_term_mapping_id"],
      },
    ],
  }
);

studentHistoricalResultModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default studentHistoricalResultModel;
