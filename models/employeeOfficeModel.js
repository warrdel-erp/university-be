import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'employee_office',
    {
        employeeOfficeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_office_id'
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
        joiningDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'joining_date'
        },
        confirmationDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'confirmation_date'
        },
        relievingDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'relieving_date'
        },
        retirementDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'retirement_date'
        },
        transferDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'transfer_date'
        },
        resignationDate:{
            type: DataTypes.DATE,
            allowNull: true,
            field: 'resignation_date'
        },
        noticePeriod:{
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'notice_period'
        },
        employeeFileNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'employee_file_number'
        },
        officeMailId: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'office_mail_id'
        },
        istActive:{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field:'ist_active'
        },
        bankName:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'bank_name'
        },
        accountNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'account_number'
        },
        ifscCode:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'ifsc_code'
        },
        iindActive:{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field:'iind_active'
        },
        bankNameIInd:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'bank_name_IInd'
        },
        accountNumberIInd:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'account_number_IInd'
        },
        ifscCodeIInd:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'ifsc_code_IInd'
        },
        contractBased:{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field:'contract_based'
        },
        gpf:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        esiNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'esi_number'
        },
        uanNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'uan_number'
        },
        lectureBased:{
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field:'lecture_based'
        },
        pfNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'pf_number'
        },
        panNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'pan_number'
        },
        voterId:{
            type: DataTypes.STRING,
            allowNull: true,
            field:'voter_id'
        },
        aadharNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'aadhar_number'
        },
        spouseName:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'spouse_name'
        },
        nomineeName:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'nominee_name'
        },
        officeExtensionNumber:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'office_extension_number'
        },
        employeeRank:{
            type: DataTypes.STRING,
            allowNull: true,
            field: 'employee_rank'
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
        tableName: 'employee_office',
        timestamps: true,
        paranoid: true
    }
);