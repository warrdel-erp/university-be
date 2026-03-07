import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import user from './userModel.js';
import { ROLES } from '../const/roles.js';

export default sequelize.define(
    'user_roles',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_role_id'
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
        role: {
            type: DataTypes.ENUM(...Object.values(ROLES)),
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
        tableName: 'user_roles',
        timestamps: true,
        paranoid: true
    }
);
