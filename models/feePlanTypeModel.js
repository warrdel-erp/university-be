import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import feePlan from "./feePlanModel.js";
import feeType from "./feeTypeModel.js";

export default sequelize.define(
    'fee_plan_type',
    {
        feePlanTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'fee_plan_type_id'
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
        feeTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'fee_type_id',
            references: {
                model: feeType,
                key: 'fee_type_id'
            }
        },
        dueDate :{
            type:DataTypes.DATE,
            allowNull:true,
            field : 'due_date'
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
        tableName: 'fee_plan_type',
        timestamps: true,
        paranoid: true
    }
);