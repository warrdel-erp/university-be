import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import employee from "./employeeModel.js";

export default sequelize.define(
  'employee_code_master_mapping',
  {
    employeeCodeMasterMappingId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'employee_code_master_mapping_id'
    },
    employeeCodeMasterTypeId: {
        type: DataTypes.INTEGER,
        allowNull:false,
        field: 'employee_code_master_type_id',
        references:{
            model :employeeCodeMasterType,
            key:'employee_code_master_type_id'
        }
    },
    employeeId: { 
        type: DataTypes.INTEGER,
        allowNull:false,
        field: 'employee_id',
        references:{
            model :employee,
            key:'employee_id'
        }
    },
    // salutation:{
    //     type:DataTypes.INTEGER,
    //     allowNull :true,
    // },
    // employeeGroup:{
    //     type:DataTypes.INTEGER,
    //     allowNull:true,
    //     field:'employee_group',
    // },
    // gender:{
    //     type:DataTypes.INTEGER,
    //     allowNull:true,
    // },
    // maritalStatus:{
    //     type:DataTypes.INTEGER,
    //     allowNull:true,
    //     field:'marital_status',
    // },
    // caste:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    // },
    // religion:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    // },
    // nationality:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    // },
    // bloodGroup:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    //     field:'blood_group'
    // },
    // appointmentType:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    //     field:'appointment_type',
    // },
    // jobStatus:{
    //     type:DataTypes.INTEGER,
    //     allowNull: true,
    //     field: 'job_status'
    // },
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
    tableName: 'employee_code_master_mapping',
    timestamps: true,
    paranoid:true
},
);