import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feeType from "./feeTypeModel.js";
import studentInvoiceMapperModel from "./studentInvoiceMapperModel.js";

export default sequelize.define(
    'fee_type_group',
    {
        feeTypeGroupId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_type_group_id'
        },
        
        feeTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_type_id',
            references: {
                model: feeType,
                key: 'fee_type_id'
            }
        },
        studentInvoiceMapperId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'student_invoice_mapper_id',
            references: {
                model: studentInvoiceMapperModel,
                key: 'student_invoice_mapper_id'
            }
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        waiver: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        subtotal: {
            type: DataTypes.STRING,
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
        }
    },
    {
        tableName: 'fee_type_group',
        timestamps: true,
        paranoid: true
    }
);