import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js"

export default sequelize.define(
    'employee_activity',
    {
        employeeActivityId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_activity_id'
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
        activity:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        monthYear:{
			type:DataTypes.DATE,
			allowNull:true,
            field:'month_year'
		},
        remarks:{
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
        tableName: 'employee_activity',
        timestamps: true,
        paranoid: true
    }
);