import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const electivePoolModel = sequelize.define(
  'elective_pool',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'name',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'code',
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: true,
      field: 'description',
    },
    scope: {
      type: DataTypes.ENUM('institute', 'programme', 'batch'),
      allowNull: false,
      defaultValue: 'programme',
      field: 'scope',
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'course_id',
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'batch_id',
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'institute_id',
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'university_id',
    },
    campusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'campus_id',
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
    tableName: 'elective_pool',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

electivePoolModel.scopeConfig = {
  university: true,
  institute: true,
  academicYear: false,
};

export default electivePoolModel;

