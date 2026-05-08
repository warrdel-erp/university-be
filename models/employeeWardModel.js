import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'employee_ward',
    {
        employeeWardId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_ward_id'
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
        wardName:{
            type: DataTypes.STRING,
            allowNull: false,
            field: 'ward_name'
        },
        studyIn:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'study_in'
		},
        annualFees:{
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'annual_fees'
        },
        dateOfBirth:{
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'date_of_birth'
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
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        // updatedBy: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'updated_by',
        //     references: {
        //         model: users,
        //         key: 'user_id'
        //     }
        // },
    },
    {
        tableName: 'employee_ward',
        timestamps: true,
        paranoid: false
    }
);