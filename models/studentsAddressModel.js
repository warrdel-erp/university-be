import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import student from "./studentModel.js"
import { city, country, state } from "../constant.js";

export default sequelize.define(
    'students_address',
    {
        studentsAddressId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'students_address_id'
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
            }
        },
        pAddress:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'p_address'
        },
        pCountry:{
            type: DataTypes.ENUM(...country),
            allowNull: true,
            field:'p_country'
        },
        pState:{
            type:DataTypes.ENUM(...state),
            allowNull: true,
            field:'p_state'
        },
        pcity:{
            type: DataTypes.ENUM(...city),
            allowNull: true,
            field:'p_city'
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
        cCountry:{
            type: DataTypes.ENUM(...country),
            allowNull: true,
            field:'c_country'
        },
        cState:{
            type:DataTypes.ENUM(...state),
            allowNull: true,
            field:'c_state'
        },
        ccity:{
            type: DataTypes.ENUM(...city),
            allowNull: true,
            field:'c_city'
        },
        cPincode:{
			type:DataTypes.INTEGER,
			allowNull:true,
            field:'c_pincode'
		},
        contact:{
            type:DataTypes.STRING,
            allowNull:true
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
        tableName: 'students_address',
        timestamps: true,
        paranoid: true
    }
);