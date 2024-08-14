import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';

export default sequelize.define(
  'employee_code_master',
  {
    employeeCodeMasterId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'employee_code_master_id'
    },
    codeMasterType :{
        type: DataTypes.STRING,
        allowNull: false,
        field: 'code_master_type'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'created_at',
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'updated_at',
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
},  
{
    tableName: 'employee_code_master',
    timestamps: true,
    paranoid:true
},
);