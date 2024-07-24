import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import course from "./courseModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'specialization',
    {
        specializationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'specialization_id'
        },
        course_Id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: course,
                key: 'course_id'
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
        specializationName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'specialization_name'
        },
        specializationCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'specialization_code'
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
        tableName: 'specialization',
        timestamps: true,
        paranoid: true
    }
);