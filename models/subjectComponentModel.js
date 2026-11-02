import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const subjectComponentModel = sequelize.define(
  'subject_component',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id',
    },
    componentName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'component_name',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'code',
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
    tableName: 'subject_component',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

subjectComponentModel.scopeConfig = {
  university: false,
  institute: false,
  academicYear: false,
};

export default subjectComponentModel;

