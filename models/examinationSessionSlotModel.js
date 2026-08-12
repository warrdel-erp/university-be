import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import examinationSessionModel from "./examinationSessionModel.js";
import userModel from "./userModel.js";

const examinationSessionSlotModel = sequelize.define(
    'examination_session_slot',
    {
        examinationSessionSlotId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: 'examination_session_slot_id'
        },
        examinationSessionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'examination_session_id',
            references: {
                model: examinationSessionModel,
                key: 'examination_session_id'
            }
        },
        slotNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'slot_number'
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'start_time'
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'end_time'
        },
        durationMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'duration_minutes'
        },
        createdBy: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'created_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: userModel,
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
        tableName: 'examination_session_slot',
        timestamps: true,
        paranoid: true
    }
);

examinationSessionSlotModel.scopeConfig = { university: false, institute: false, academicYear: false };

export default examinationSessionSlotModel;
