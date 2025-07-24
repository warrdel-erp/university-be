import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feeNewInvoice from "./feeNewInvoiceModel.js";

export default sequelize.define(
    'fee_plan_semester',
    {
        feePlanSemesterId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_plan_semester_id'
        },
        feeNewInvoiceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'fee_new_invoice_id',
            references: {
                model: feeNewInvoice,
                key: 'fee_new_invoice_id'
            }
        },
        name :{
            type:DataTypes.STRING,
            allowNull:false,
        },
        fee:{
            type:DataTypes.INTEGER,
            allowNull:false,
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
        tableName: 'fee_plan_semester',
        timestamps: true,
        paranoid: true
    }
);