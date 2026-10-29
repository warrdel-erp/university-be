import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import subjectModel from "./subjectModel.js";
import subjectComponentModel from "./subjectComponentModel.js";

const subjectComponentMappingModel = sequelize.define(
  'subject_component_mapping',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
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
    subjectComponentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subject_component_id',
      references: {
        model: subjectComponentModel,
        key: 'id',
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
  },
  {
    tableName: 'subject_component_mapping',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

subjectComponentMappingModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default subjectComponentMappingModel;

