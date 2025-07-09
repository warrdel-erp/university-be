import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feeInvoice from "./feeInvoiceModel.js";
import feePlanTypeModel from "./feePlanTypeModel.js";
import feePlanSemesterModel from "./feePlanSemesterModel.js";

export default sequelize.define(
    'fee_invoice_details',
    {
        feeInvoiceDetailsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_invoice_details_id'
        },
        feeInvoiceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'fee_invoice_id',
            references: {
                model: feeInvoice,
                key: 'fee_invoice_id'
            }
        },
        feePlanTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_plan_type_id',
            defaultValue:null,
            references: {
                model: feePlanTypeModel,
                key: 'fee_plan_type_id'
            }
        },
        feePlanSemesterId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_plan_semester_id',
            defaultValue:null,
            references: {
                model: feePlanSemesterModel,
                key: 'fee_plan_semester_id'
            }
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        waiver: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        subTotal: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field:'sub_total'
        },
        paidAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field:'paid_amount'
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
        }
    },
    {
        tableName: 'fee_invoice_details',
        timestamps: true,
        paranoid: true
    }
);