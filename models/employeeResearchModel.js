import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'employee_research',
    {
        employeeResearchId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_research_id'
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
        thesisName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'thesis_name'
        },   
        associate: {
            type: DataTypes.STRING,
            allowNull: true,
        },   
        periodFrom: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'period_from'
        },
        to: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        institution:{
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
        tableName: 'employee_research',
        timestamps: true,
        paranoid: false
    }
);