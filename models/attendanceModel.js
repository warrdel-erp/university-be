import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import student from "./studentModel.js";
import classSection from "./classSectionModel.js";
import classScheduleModel from "./classScheduleModel.js";
import institute from "./instituteModel.js";
import university from "./universityModel.js";

export default sequelize.define(
    'attendance',
    {
        attendanceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'attendance_id'
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
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
        timeTableMappingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_mapping_id',
            references: {
                model: classScheduleModel,
                key: 'time_table_mapping_id'
            }
        },
        classSectionsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_sections_id',
            references: {
                model: classSection,
                key: 'class_sections_id'
            }
        },
        date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        attendanceStatus: {
            type: DataTypes.ENUM("Present", "Late", "Absent", "Medical", "Duty Leave"),
            allowNull: false,
            field: 'attendance_status'
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
        tableName: 'attendance',
        timestamps: true,
        paranoid: true
    }
);