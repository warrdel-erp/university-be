import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import department from "./departmentModel.js";
import university from "./universityModel.js";
import employee from "./employeeModel.js";

export default sequelize.define(
    'staff',
    {
        staffId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'staff_id'
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
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
                references: {
                    model: employee,
                    key: 'employee_id'
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
        tableName: 'staff',
        timestamps: true,
        paranoid: true
    }
);