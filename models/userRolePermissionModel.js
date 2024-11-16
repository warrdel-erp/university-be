import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import role from './roleModel.js';
import permission from './permissionModel.js';
import user from './userModel.js';

export default sequelize.define(
    'user_role_permission',
    {
        userRolePermissionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_role_permission_id'
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'role_id',
            references: {
                model: role,
                key: 'role_id'
            }
        },
        permissionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'permission_id',
            references: {
                model: permission,
                key: 'permission_id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: user,
                key: 'user_id'
            }
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
        tableName: 'user_role_permission',
        timestamps: true,
        paranoid: true
    }
);