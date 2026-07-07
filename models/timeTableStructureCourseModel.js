import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import courseModel from "./courseModel.js";
import timeTableStructureModel from "./timeTableStructureModel.js";

const timeTableStructureCourseModel = sequelize.define(
    'time_table_structure_course',
    {
        timeTableStructureCourseId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_structure_course_id'
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
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
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
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id'
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
        tableName: 'time_table_structure_course',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['time_table_name_id', 'course_id'],
                name: 'unique_time_table_structure_course'
            }
        ]
    }
);

timeTableStructureCourseModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default timeTableStructureCourseModel;
