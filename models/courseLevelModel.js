import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import affiliatedUniversity from "./affiliatedUniversityModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'course_level',
    {
        courseLevelId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'course_level_id'
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
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        courseLevelName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'course_level_name'
        },
        courseLevelCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'course_level_code'
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
        tableName: 'course_level',
        timestamps: true,
        paranoid: true
    }
);