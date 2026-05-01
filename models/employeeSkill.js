import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";

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
        proficiencyLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'proficiency_level',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
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
        tableName: 'employee_skill',
        timestamps: true,
        paranoid: false
    }
);