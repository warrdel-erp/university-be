import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js"

export default sequelize.define(
    'employee_experiance',
    {
        employeeExperianceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_experiance_id'
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
        organization:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        desigation:{
			type:DataTypes.STRING,
			allowNull:true,
		},
        fromDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'from_date'
        },
        toDate:{
			type:DataTypes.DATE,
			allowNull:true,
            field:'to_date'
		},
        totalExperianceYears:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'total_experince_years'
		},
        totalExperianceMonths:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'total_experince_months'
		},
        totalExperiancedays:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'total_experince_days'
		},
        lastSalary:{
			type:DataTypes.FLOAT,
			allowNull:true,
            field:'last_salary'
		},
        remarks:{
			type:DataTypes.STRING,
			allowNull:true,
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
        tableName: 'employee_experiance',
        timestamps: true,
        paranoid: true
    }
);