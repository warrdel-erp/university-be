import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js"

export default sequelize.define(
    'employee_address',
    {
        employeeAddressId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_address_id'
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
        pAddress:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'p_address'
        },
        pPincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'p_pincode'
		},
        cAddress:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'c_address'
        },
        cPincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'c_pincode'
		},
        phoneNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'phone_number'
        },
        mobileNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'mobile_number'
        },
        officalMobileNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'offical_mobile_number'
        },
        officalEmailId:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'offical_email_id'
        },
        personalEmail:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'personal_email'
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
        tableName: 'employee_address',
        timestamps: true,
        paranoid: true
    }
);