import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import courseLevel from "./courseLevelModel.js";
import university from "./universityModel.js";

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
                model: courseLevel,
                key: 'course_level_id'
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