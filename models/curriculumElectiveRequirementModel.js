import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import curriculumModel from "./curriculumModel.js";
import curriculumCategoryModel from "./curriculumCategoryModel.js";
import electivePoolModel from "./electivePoolModel.js";

const curriculumElectiveRequirementModel = sequelize.define(
  'curriculum_elective_requirement',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
    },
    curriculumId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'curriculum_id',
      references: {
        model: curriculumModel,
        key: 'curriculum_id',
      },
    },
    term: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'term',
    },
    requirementCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'requirement_code',
    },
    requirementName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'requirement_name',
    },
    curriculumCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'curriculum_category_id',
      references: {
        model: curriculumCategoryModel,
        key: 'id',
      },
    },
    courseCount: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'course_count',
    },
    coursesRequired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'courses_required',
    },
    minCredits: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'min_credits',
    },
    electivePoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'elective_pool_id',
      references: {
        model: electivePoolModel,
        key: 'id',
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by',
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
    tableName: 'curriculum_elective_requirement',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

curriculumElectiveRequirementModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default curriculumElectiveRequirementModel;

