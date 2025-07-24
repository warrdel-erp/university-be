import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feePlan from "./feePlanModel.js";

export default sequelize.define(
    'fee_new_invoice',
    {
        feeNewInvoiceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_new_invoice_id'
        },
        feePlanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'fee_plan_id',
            references: {
                model: feePlan,
                key: 'fee_plan_id'
            }
        }, 
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull:true,
            field:'start_date'
        },
        EndDate: {
            type: DataTypes.DATEONLY,
            allowNull:true,
            field:'End_date'
        },
        total :{
            type:DataTypes.INTEGER,
            allowNull:true
        },
        InvoiceNumber :{
            type:DataTypes.STRING,
            allowNull:true
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
        tableName: 'fee_new_invoice',
        timestamps: true,
        paranoid: true
    }
);