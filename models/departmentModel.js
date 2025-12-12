import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import subAccount from "./subAccountModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'department',
    // this is subAccount model not a department model 
    {
        departmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'department_id'
        },
        subAccountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sub_account_id',
                references: {
                    model: subAccount,
                    key: 'sub_account_id'
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
        departmentOrder : {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'department_order',
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
        tableName: 'department',
        timestamps: true,
        paranoid: true
    }
);