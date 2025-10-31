import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import affiliatedUniversity from "./affiliatedUniversityModel.js";
import users from "./userModel.js";
// import acedmicYearModel from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
    'course',
    {
        courseId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'course_id'
        },
        course_levelId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_level_id',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        affiliatedUniversityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'affiliated_university_id',
            references: {
                model: affiliatedUniversity,
                key: 'affiliated_university_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        // acedmicYearId:{
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'acedmic_year_id',
        //     references:{
        //         model:acedmicYearModel ,
        //         key: 'acedmic_year_id'
        //     }
        // },
        courseDuration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_duration'
        },
        courseName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'course_name'
        },
        courseCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'course_code'
        },
        capacity: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isActive:{
            type:DataTypes.BOOLEAN,
            allowNull:false,
            defaultValue:true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
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
        tableName: 'course',
        timestamps: true,
        paranoid: true
    }
);