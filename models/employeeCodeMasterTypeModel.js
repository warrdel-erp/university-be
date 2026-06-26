import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import employeeCodeMaster from "./employeeCodeMasterModel.js";
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";

const employeeCodeMasterTypeModel = sequelize.define(
  'employee_code_master_type',
  {
    employeeCodeMasterTypeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'employee_code_master_type_id'
    },
    employeeCodeMasterId: {
        type: DataTypes.INTEGER,
        allowNull:false,
        field: 'employee_code_master_id',
        references:{
            model :employeeCodeMaster,
            key:'employee_code_master_id'
        }
    },
    code :{
        type: DataTypes.STRING,
        allowNull: false,
    },
    description:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    universityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'university_id',
        references: {
            model: university,
            key: 'university_id',
        },
    },
    instituteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'institute_id',
        references: {
            model: institute,
            key: 'institute_id',
        },
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
    // updatedBy: {
    //     type: DataTypes.INTEGER,
    //     allowNull: false,
    //     field: 'updated_by',
    //     references: {
    //         model: users,
    //         key: 'user_id'
    //     }
    // },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
},  
{
    tableName: 'employee_code_master_type',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['employee_code_master_id', 'university_id', 'institute_id', 'code'],
            name: 'unique_code_master_type_per_tenant_category',
        },
    ],
},
);

employeeCodeMasterTypeModel.scopeConfig = { university: true, institute: false, academicYear: false };

export default employeeCodeMasterTypeModel;
