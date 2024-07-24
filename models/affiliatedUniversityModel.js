import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import institute from "./instituteModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'affiliated_university',
    {
        affiliatedUniversityId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'affiliated_university_id'
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id'
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
        affiliatedUniversityName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'affiliated_university_name'
        },
        affiliatedUniversityCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'affiliated_university_code'
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
        tableName: 'affiliated_university',
        timestamps: true,
        paranoid: true
    }
);