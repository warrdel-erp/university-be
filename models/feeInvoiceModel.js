import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feeGroup from "./feeGroupModel.js";
import classStudentMapper from "./classSectionStudentMapperModel.js";
import studentModel from "./studentModel.js";

export default sequelize.define(
    'fee_invoice',
    {
        feeInvoiceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_invoice_id'
        },
        invoiceNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'invoice_number'
        },
        feeGroupId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'fee_group_id',
            references: {
                model: feeGroup,
                key: 'fee_group_id'
            }
        },
        classStudentMapperId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_student_mapper_id',
            references: {
                model: classStudentMapper,
                key: 'class_student_mapper_id'
            }
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
        createdDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'created_date',
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'due_date',
        },
        paymentStatus: {
            type: DataTypes.STRING,
            allowNull:true,
            field:'payment_status'
        },
        paymentMethod: {
            type: DataTypes.STRING,
            allowNull:true,
            field:'payment_method'
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
        tableName: 'fee_invoice',
        timestamps: true,
        paranoid: true
    }
);