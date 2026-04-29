import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import classRoomModel from "./classRoomModel.js";

import examScheduleModel from "./examScheduleModel.js";

export default sequelize.define(
    'exam_schedule_room_capacity',
    {
        examScheduleRoomCapacityId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_schedule_room_capacity_id'
        },
        examScheduleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_schedule_id',
            references: {
                model: examScheduleModel,
                key: 'exam_schedule_id'
            }
        },
        classRoomSectionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_room_section_id',
            references: {
                model: classRoomModel,
                key: 'class_room_section_id'
            }
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        columns: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        orderKey: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'order_key'
        },

        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        }
    },
    {
        tableName: 'exam_schedule_room_capacity',
        timestamps: true
    }
);
