import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import electivePoolModel from "./electivePoolModel.js";
import subjectModel from "./subjectModel.js";

const electivePoolSubjectMappingModel = sequelize.define(
  'elective_pool_subject_mapping',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
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
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subject_id',
      references: {
        model: subjectModel,
        key: 'subject_id',
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
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
    tableName: 'elective_pool_subject_mapping',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

electivePoolSubjectMappingModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default electivePoolSubjectMappingModel;

