import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import institute from "./instituteModel.js";

const employeeCodeMasterModel = sequelize.define(
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

employeeCodeMasterModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default employeeCodeMasterModel;
