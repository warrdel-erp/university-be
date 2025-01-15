import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import userModel from "./userModel.js";
import examSetupModel from "./examSetupModel.js";
import studentModel from "./studentModel.js";

const examAttendanceModel = sequelize.define(
    "exam_attendance",
    {
        examAttendanceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "exam_attendance_id",
        },
        examSetupId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: examSetupModel,
                key: "exam_setup_id",
            },
            field: "exam_setup_id",
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: studentModel,
                key: "student_id",
            },
            field: "student_id",
        },
        attendanceStatus: {
            type: DataTypes.ENUM("Present", "Absent"),
            allowNull: false,
            field: "attendance_status",
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "created_by",
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "updated_by",
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at",
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at",
        },
    },
    {
        tableName: "exam_attendance",
        timestamps: true,
        paranoid: true,
    }
);


export default examAttendanceModel;
