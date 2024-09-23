import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import users from "./userModel.js";
import courseModel from "./courseModel.js";

export default sequelize.define(
  'time_table_creation',
  {
    timeTableCreationId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'time_table_creation_id'
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'course_id',
        references: {
            model: courseModel,
            key: 'course_id'
        }
    },
    ApplicablePeriod: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'applicable_period',
        references: {
            model: employeeCodeMasterType,
            key: 'employee_code_master_type_id'
        }
    },
    maximumPeriod :{
        type: DataTypes.INTEGER,
        allowNull: false,
        field:'maximum_period'
    },
    startingTime:{
        type: DataTypes.STRING,
        allowNull: false,
        field:'starting_time'
    },
    startTime:{
        type: DataTypes.STRING,
        allowNull: true,
        field:'start_time'
    },
    endTime:{
        type: DataTypes.STRING,
        allowNull: true,
        field:'end_time'
    },
    periodLength:{
        type: DataTypes.INTEGER,
        allowNull: false,
        field:'period_length'
    },
    periodGap:{
        type: DataTypes.INTEGER,
        allowNull: false,
        field:'period_gap'
    },
    weekOff:{
        type: DataTypes.JSON,
        allowNull: false,
        field:'week_off'
    },
    type:{
        type: DataTypes.STRING,
        allowNull:true
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
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by',
        references: {
            model: users,
            key: 'user_id'
        }
    },
    updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'updated_by',
        references: {
            model: users,
            key: 'user_id'
        }
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
},  
{
    tableName: 'time_table_creation',
    timestamps: true,
    paranoid:true
},
);