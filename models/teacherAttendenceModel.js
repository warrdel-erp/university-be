import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import scheduleAssignModel from "./ScheduleAssignModel.js";

const teacherAttendenceModel = sequelize.define(
    "teacher_attendence",
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
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
        teacherAttendenceId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "teacher_attendence_id",
        },
        scheduleAssignId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'schedule_assign_id',
            references: {
                model: scheduleAssignModel,
                key: 'schedule_assign_id'
            }
        },
        checkIn: {
            type: DataTypes.TIME,
            allowNull: true,
            field: "check_in",
        },
        checkOut: {
            type: DataTypes.TIME,
            allowNull: true,
            field: "check_out",
        },
        date:{
            type:DataTypes.DATE,
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
        tableName: "teacher_attendence",
        timestamps: true,
        paranoid: true,
    }
);

teacherAttendenceModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default teacherAttendenceModel;
