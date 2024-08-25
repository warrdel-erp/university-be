import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import affiliatedUniversity from "./affiliatedUniversityModel.js";

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