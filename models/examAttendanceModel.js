import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import userModel from "./userModel.js";
import examScheduleModel from "./examScheduleModel.js";
import examScheduleRoomCapacityModel from "./examScheduleRoomCapacityModel.js";
import studentModel from "./studentModel.js";
import studentExamSeatModel from "./studentExamSeatModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";

const examAttendanceModel = sequelize.define(
    "exam_attendance",
    {
                universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        examAttendanceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "exam_attendance_id",
        },
        examScheduleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: examScheduleModel,
                key: "exam_schedule_id",
            },
            field: "exam_schedule_id",
        },
        examScheduleRoomCapacityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: examScheduleRoomCapacityModel,
                key: "exam_schedule_room_capacity_id",
            },
            field: "exam_schedule_room_capacity_id",
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
        studentExamSeatId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: studentExamSeatModel,
                key: "student_exam_seat_id",
            },
            field: "student_exam_seat_id",
        },
        attendanceStatus: {
            type: DataTypes.ENUM("PRESENT", "ABSENT", "PENDING"),
            allowNull: false,
            defaultValue: "PENDING",
            field: "attendance_status",
        },
        markedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: userModel,
                key: "user_id",
            },
            field: "marked_by",
        },
        markedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "marked_at",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: "remarks",
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: universityModel,
                key: "university_id",
            },
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'academic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: "exam_attendance",
        timestamps: true,
        paranoid: true,
    }
);

examAttendanceModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examAttendanceModel;
