import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import role from './roleModel.js';
import permission from './permissionModel.js';

export default sequelize.define(
    'role_permission_mapping',
    {
        rolePermissionMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'role_permission_mapping_id'
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
            allowNull: true,
            field: 'permission_id',
            references: {
                model: permission,
                key: 'permission_id'
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
        tableName: 'role_permission_mapping',
        timestamps: true,
        paranoid: true
    }
);