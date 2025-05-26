import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import campus from "./campusModel.js";
import university from "./universityModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'institute',
    {
        instituteId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'institute_id'
        },
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        instituteName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'institute_name'
        },
        instituteCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'institute_code'
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
                model: 'users',
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
        tableName: 'institute',
        timestamps: true,
        paranoid: true
    }
);