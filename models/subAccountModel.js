import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import account from "./accountModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'sub_account',
    {
        subAccountId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'sub_account_id'
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'account_id',
                references: {
                    model: account,
                    key: 'account_id'
                }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
                references: {
                    model: university,
                    key: 'university_id'
                }
        },
        departmentName: {
            type: DataTypes.STRING,
            field: 'department_name',
            allowNull: false,
        },
        alternateName: {
            type: DataTypes.STRING,
            field: 'alternate_name',
            allowNull: true,
        },
        departmentCode: {
            type: DataTypes.STRING,
            field: 'department_code',
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
                references: {
                    model: users,
                    key: 'user_id'
                }
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
        tableName: 'sub_account',
        timestamps: true,
        paranoid: true
    }
);