import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import role from './roleModel.js';
import user from './userModel.js';

const userRolePermissionModel = sequelize.define(
    'user_role_permission_scope',
    {
        userRolePermissionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_role_permission_id'
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'role_id',
            references: {
                model: role,
                key: 'role_id'
            }
        },
        permission: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Permission key from const/permissions.js (e.g. perm_3pvhh7qk)'
        },
        scope: {
            type: DataTypes.ENUM('OWN', 'CLASS', 'DEPARTMENT', 'INSTITUTE', 'CAMPUS', 'UNIVERSITY'),
            allowNull: false,
            defaultValue: 'INSTITUTE',
            comment: 'Scope level from const/scopes.js'
        },
        resourceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'resource_id',
            comment: 'The specific ID of the resource (Institute ID, Department ID, etc.) determined by the scope.'
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
        tableName: 'user_role_permission_scope',
        timestamps: true,
        paranoid: false
    }
);

userRolePermissionModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default userRolePermissionModel;
