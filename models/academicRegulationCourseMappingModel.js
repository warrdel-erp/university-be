import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import academicRegulationModel from "./academicRegulationModel.js";
import courseModel from "./courseModel.js";
import sessionModel from "./sessionModel.js";
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";

const academicRegulationCourseMappingModel = sequelize.define(
    'academic_regulation_course_mapping',
    {
        academicRegulationCourseMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_regulation_course_mapping_id'
        },
        academicRegulationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'academic_regulation_id',
            references: {
                model: academicRegulationModel,
                key: 'academic_regulation_id'
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
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
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
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
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
        tableName: 'academic_regulation_course_mapping',
        timestamps: true,
        paranoid: true
    }
);

academicRegulationCourseMappingModel.scopeConfig = { university: true, institute: true };

export default academicRegulationCourseMappingModel;
