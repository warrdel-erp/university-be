import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import studentModel from "./studentModel.js";
import curriculumSubjectTermMappingModel from "./curriculumSubjectTermMappingModel.js";
import assessmentPlanComponentModel from "./assessmentPlanComponentModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const studentResultItemModel = sequelize.define(
  'student_result_item',
  {
    studentResultItemId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'student_result_item_id',
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'student_id',
      references: {
        model: studentModel,
        key: 'student_id',
      },
    },
    curriculumSubjectTermMappingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'curriculum_subject_term_mapping_id',
      references: {
        model: curriculumSubjectTermMappingModel,
        key: 'curriculum_subject_term_mapping_id',
      },
    },
    assessmentPlanComponentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assessment_plan_component_id',
      references: {
        model: assessmentPlanComponentModel,
        key: 'assessment_plan_component_id',
      },
    },
    maximumMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      field: 'maximum_marks',
    },
    obtainedMarks: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      field: 'obtained_marks',
    },
    creditEarned: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      field: 'credit_earned',
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'university_id',
      references: {
        model: universityModel,
        key: 'university_id',
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'institute_id',
      references: {
        model: instituteModel,
        key: 'institute_id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    tableName: 'student_result_item',
    timestamps: true,
    paranoid: true,
  }
);

studentResultItemModel.scopeConfig = {
  university: true,
  institute: true,
};

export default studentResultItemModel;
