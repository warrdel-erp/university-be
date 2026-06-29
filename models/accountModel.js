import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const accountModel = sequelize.define(
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

accountModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default accountModel;
