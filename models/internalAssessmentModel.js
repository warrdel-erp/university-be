import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";

const internalAssessmentModel = sequelize.define(
  "internal_assessment",
  {
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
    classSectionTermId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "class_section_term_id",
      references: {
        model: "class_section_term",
        key: "class_section_term_id",
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "session_id",
      references: {
        model: "session",
        key: "session_id",
      },
    },
    internalAssessmentId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "internal_assessment_id",
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: users,
        key: "user_id",
      },
    },

    examSetupTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "exam_setup_type_id",
      references: {
        model: examSetupTypeModel,
        key: "exam_setup_type_id",
      },
    },
    weightage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maximumMarks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "maximum_marks",
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "issue_date",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "due_date",
    },
    documentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "document_url",
    },
    mode: {
      type: DataTypes.ENUM("online", "offline"),
      allowNull: true,
    },
    weightagePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "weightage_percentage",
    },
    normalizedMaxMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "normalized_max_marks",
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
    tableName: "internal_assessment",
    timestamps: true,
  },
);

internalAssessmentModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default internalAssessmentModel;
