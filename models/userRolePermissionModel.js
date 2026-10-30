import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import role from './roleModel.js';
import user from './userModel.js';
import university from './universityModel.js';

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
            allowNull: false,
            field: 'role_id',
            references: {
                model: role,
                key: 'role_id'
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
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
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
