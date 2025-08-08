import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import studentModel from "./studentModel.js";
import universityModel from "./universityModel.js";
import feeNewInvoiceModel from "./feeNewInvoiceModel.js";
import feePlanModel from "./feePlanModel.js";

export default sequelize.define(
    'student_invoice_mapper',
    {
        studentInvoiceMapperId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'student_invoice_mapper_id'
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: studentModel,
                key: 'student_id'
            }
        }, 
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        }, 
        feeNewInvoiceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_new_invoice_id',
            references: {
                model: feeNewInvoiceModel,
                key: 'fee_new_invoice_id'
            }
        }, 
        feePlanId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_plan_id',
            references: {
                model: feePlanModel,
                key: 'fee_plan_id'
            }
        },
        invoiceDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field:'invoice_date'
        },
        invoiceNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            field:'invoice_number'
        },
        invoiceStatus: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field:'invoice_status'
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
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id'
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'student_invoice_mapper',
        timestamps: true,
        paranoid: true
    }
);