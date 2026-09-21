import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import sessionModel from "./sessionModel.js";
import users from "./userModel.js";

const sessionBatchMappingModel = sequelize.define(
    'session_batch_mapping',
    {
        sessionBatchMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'session_batch_mapping_id'
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
        },
        batch: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'batch'
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
            allowNull: true,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        }
    },
    {
        tableName: 'session_batch_mapping',
        timestamps: true
    }
);

export default sessionBatchMappingModel;
