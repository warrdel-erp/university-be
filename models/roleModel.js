import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const roleModel = sequelize.define(
    'role',
    {
        roleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'role_id'
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'institute_id',
            comment: 'Multi-tenant isolation for roles'
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
        tableName: 'role',
        timestamps: true,
        paranoid: true
    }
);

roleModel.scopeConfig = { university: false, institute: true, academicYear: false };

export default roleModel;
