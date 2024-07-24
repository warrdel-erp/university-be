import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";

export default sequelize.define(
    'campus',
    {
        campusId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'campus_id'
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
        campusName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'campus_name'
        },
        campusCode:{
            type: DataTypes.STRING,
            allowNull: false,
            field: 'campus_code',
        },
        latitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        longitude:{
            type: DataTypes.FLOAT,
            allowNull: true,
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
        tableName: 'campus',
        timestamps: true,
        paranoid: true
    }
);