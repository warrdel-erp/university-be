import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

export default sequelize.define(
    'permission',
    {
        permissionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'permission_id'
        },
        moduleName: {
            type: DataTypes.STRING,
            allowNull: false,
            field:'module_name'
        },
        permission: {
            type: DataTypes.STRING,
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
        tableName: 'permission',
        timestamps: true,
        paranoid: true
    }
);