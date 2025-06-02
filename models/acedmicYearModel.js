import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'acedmic_year',
    {
        acedmicYearId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'acedmic_year_id'
        },
        yearTitle: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'year_title'
        },
        startingDate: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'starting_date'
        },
        endingDate: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'ending_date'
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
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'acedmic_year',
        timestamps: true,
        paranoid: true
    }
);