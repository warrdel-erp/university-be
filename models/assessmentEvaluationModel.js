import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import electiveSubjectModel from "./electiveSubjectModel.js";
import studentModel from "./studentModel.js";

/**
 * Final Internal Assessment result per student.
 *
 * Core subject: subjectId + classSectionTermId (electiveSubjectId null)
 * Elective:     electiveSubjectId (subjectId null; classSectionTermId optional)
 *
 * Composition/weightage → internal_assessment
 * Raw marks → internal_assessment_student_evaluation
 * Locked total → this table
 */
const assessmentEvaluationModel = sequelize.define(
  "assessment_evalution",
  {
    assessmentEvalutionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "assessment_evalution_id",
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
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "subject_id",
      references: {
        model: subjectModel,
        key: "subject_id",
      },
      comment: "Core subject; null when electiveSubjectId is set",
    },
    electiveSubjectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "elective_subject_id",
      references: {
        model: electiveSubjectModel,
        key: "elective_subject_id",
      },
      comment: "Elective subject; null when subjectId is set",
    },
    classSectionTermId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "class_section_term_id",
      references: {
        model: "class_section_term",
        key: "class_section_term_id",
      },
      comment: "Required for core subject IA; optional for elective",
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: users,
        key: "user_id",
      },
      comment: "Faculty who calculated/submitted the final IA",
    },
    iaMaximumMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "ia_maximum_marks",
      comment: "IA scale max (e.g. 20)",
    },
    marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: "Calculated final IA marks out of iaMaximumMarks",
    },
    status: {
      type: DataTypes.ENUM("pending", "submitted"),
      allowNull: false,
      defaultValue: "pending",
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "submitted_at",
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "assessment_evalution",
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        unique: true,
        name: "unique_student_subject_class_section_term_ia",
        fields: ["student_id", "subject_id", "class_section_term_id"],
      },
      {
        unique: true,
        name: "unique_student_elective_subject_ia",
        fields: ["student_id", "elective_subject_id"],
      },
    ],
  },
);

assessmentEvaluationModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: true,
};

export default assessmentEvaluationModel;
