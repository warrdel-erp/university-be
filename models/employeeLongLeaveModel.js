import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js"

export default sequelize.define(
    'employee_long_leave',
    {
        employeeLongLeaveId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_long_leave_id'
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
        DateOfLeaving: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'date_of_leaving'
        },   
        DateOfRejoining: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'date_of_rejoining'
        },   
        remark: {
            type: DataTypes.STRING,
            allowNull: true,
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
        },
    },
    {
        tableName: 'employee_long_leave',
        timestamps: true,
        paranoid: true
    }
);