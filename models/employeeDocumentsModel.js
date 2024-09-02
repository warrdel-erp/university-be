import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js"

export default sequelize.define(
    'employee_documents',
    {
        employeeDocumentsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_documents_id'
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
        fromYear:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'from_year'
        },
        toYear:{
			type:DataTypes.DATE,
			allowNull:true,
            field:'to_year'
		},
        university:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'university_board'
		},
        medicalCouncilName:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'medical_council_name'
		},
        medicalRegistrationNumber:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'medical_registration_number'
		},
        medicalCouncilRegistrationDate:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'medical_council_registration_date'
		},
        medicalRegistrationExpiryDate:{
			type:DataTypes.STRING,
			allowNull:true,
            field:'medical_registration_expiry_date'
		},
        percentage:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        remarks:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        pursuing:{
            type:DataTypes.BOOLEAN,
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
        tableName: 'employee_documents',
        timestamps: true,
        paranoid: true
    }
);