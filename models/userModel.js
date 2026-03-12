import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import institute from "./instituteModel.js";

export default sequelize.define(
    'users',
    {
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_id'
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
        defaultInstituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'default_institute_id',
        },
        defaultRole: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'default_role'
        },
        defaultAcademicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'default_academic_year_id'
        },
        userName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'user_name'
        },
        uniqueId: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'unique_id',
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        dummyPassword: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'dummy_password'
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'active'
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            allowNull: true
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
        }
    },
    {
        tableName: 'users',
        timestamps: true,
        paranoid: true
    }
)