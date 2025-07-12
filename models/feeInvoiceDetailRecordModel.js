import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feeInvoice from "./feeInvoiceModel.js";
import feeInvoiceDetail from "./feeInvoiceDetailModel.js";

export default sequelize.define(
    'fee_invoice_detail_record',
    {
        feeInvoiceDetailsRecordId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_invoice_details_record_id'
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
        feeInvoiceDetailsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'fee_invoice_details_id',
            references: {
                model: feeInvoiceDetail,
                key: 'fee_invoice_details_id'
            }
        },
        paidAmount: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field:'paid_amount'
        },
        isApplyed:{
            type:DataTypes.BOOLEAN,
            allowNull:false,
            field:'is_applied'
        },
        paymentStatus: {
            type: DataTypes.STRING,
            allowNull:true,
            field:'payment_status'
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull:true,
            field:'payment_date'
        },
        paymentMethod: {
            type: DataTypes.STRING,
            allowNull:true,
            field:'payment_method'
        },
        referenceNumber: {
            type: DataTypes.STRING,
            allowNull:true,
            field:'reference_number'
        },
        paymentMade:{
            type: DataTypes.STRING,
            allowNull:true,
            field:'payment_made'
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
        tableName: 'fee_invoice_detail_record',
        timestamps: true,
        paranoid: true
    }
);