import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import department from "./departmentModel.js";

const hodDepartmentModel = sequelize.define(
    'hod_departments',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'department_id',
            references: {
                model: department,
                key: 'department_id'
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
        tableName: 'hod_departments',
        timestamps: true,
        paranoid: true
    }
);

hodDepartmentModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default hodDepartmentModel;
