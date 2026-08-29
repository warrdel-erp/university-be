import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";

const timeTableStructureModel = sequelize.define(
    'time_table_structure',
    {
        timeTableNameId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_name_id'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        maximumPeriod: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_period'
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: university,
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
                model: acedmicYear,
                key: 'acedmic_year_id'
            }
        },
        periodLength: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'period_length'
        },
        periodGap: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'period_gap'
        },
        startingTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'starting_time'
        },
        weekOff: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'week_off'
        },
        sourceTimeTableNameId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'source_time_table_name_id',
            references: {
                model: 'time_table_structure',
                key: 'time_table_name_id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at',
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id'
            }
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'department_id',
            references: {
                model: 'department',
                key: 'department_id'
            }
        },
    },
    {
        tableName: 'time_table_structure',
        timestamps: true,
        paranoid: false,
    },
);

timeTableStructureModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableStructureModel;
