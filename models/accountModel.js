import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

export default sequelize.define(
    'account',
    {
        accountId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'account_id'
        },
        accountName: {
            type: DataTypes.STRING,
            field: 'account_name',
            allowNull: false,
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
        tableName: 'account',
        timestamps: true,
        paranoid: true
    }
);