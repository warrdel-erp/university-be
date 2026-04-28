import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import student from "./studentModel.js";
import examScheduleRoomCapacity from "./examScheduleRoomCapacityModel.js";

export default sequelize.define(
    'student_exam_seat',
    {
        studentExamSeatId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'student_exam_seat_id'
        },
        examScheduleRoomCapacityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_schedule_room_capacity_id',
            references: {
                model: examScheduleRoomCapacity,
                key: 'exam_schedule_room_capacity_id'
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
            }
        },
        row: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        column: {
            type: DataTypes.INTEGER,
            allowNull: false
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
        tableName: 'student_exam_seat',
        timestamps: true
    }
);
