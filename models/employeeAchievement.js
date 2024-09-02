import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'employee_achievements',
    {
        employeeAchievementsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_achievements_id'
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
        title:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        description:{
			type:DataTypes.STRING,
			allowNull:true,
		},
        noOfTimes:{
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'no_of_times'
        },
        discipline:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        nameOf:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'name_of'
        },
        date:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'date'
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'employee_achievements',
        timestamps: true,
        paranoid: true
    }
);