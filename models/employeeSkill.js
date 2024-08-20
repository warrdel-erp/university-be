import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js"

export default sequelize.define(
    'employee_skill',
    {
        employeeSkillId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_skill_id'
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
        name:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        experienceInYear:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'experience_in_year'
		},
        experienceInMonth:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'experience_in_month'
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
        tableName: 'employee_skill',
        timestamps: true,
        paranoid: true
    }
);