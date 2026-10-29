import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const curriculumCategoryModel = sequelize.define(
  'curriculum_category',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
    },
    categoryName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'category_name',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'code',
    },
    isElectiveCoursework: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_elective_coursework',
    },
    description: {
      type: DataTypes.STRING(250),
      allowNull: true,
      field: 'description',
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
  },
  {
    tableName: 'curriculum_category',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

curriculumCategoryModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default curriculumCategoryModel;

