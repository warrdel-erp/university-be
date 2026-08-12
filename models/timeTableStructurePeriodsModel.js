import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import timeTableStructureModel from "./timeTableStructureModel.js";

const timeTableStructurePeriodsModel = sequelize.define(
    'time_table_structure_periods',
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
        timeTableCreationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_creation_id'
        },
        timeTableNameId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_name_id',
            references: {
                model: timeTableStructureModel,
                key: 'time_table_name_id'
            }
        },
        periodName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'period_name'
        },
        isCourse: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_course'
        },
        isBreak: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_break'
        },
        startTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'start_time'
        },
        endTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'end_time'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
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
    },
    {
        tableName: 'time_table_structure_periods',
        timestamps: true,
        paranoid: false,
    },
);



timeTableStructurePeriodsModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableStructurePeriodsModel;
