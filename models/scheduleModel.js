import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from "sequelize";
import users from "./userModel.js";
import institute from './instituteModel.js';
import acedmicYear from './acedmicYearModel.js';
import universityModel from "./universityModel.js";

export default sequelize.define(
    "schedule",
    {
        scheduleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "schedule_id",
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
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
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id'
            }
        },
        scheduleName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: "schedule_name",
        },
        shiftHours: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "shift_hours",
        },
        minStartTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "min_start_time",
        },
        minEndTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "min_end_time",
        },
        maxStartTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "max_start_time",
        },
        maxEndTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "max_end_time",
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "start_time",
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: "end_time",
        },
        breakTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: "break_time",
        },
        acceptExtraHours: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "accept_extra_hours",
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
        tableName: "schedule",
        timestamps: true,
        paranoid: true,
    }
);
