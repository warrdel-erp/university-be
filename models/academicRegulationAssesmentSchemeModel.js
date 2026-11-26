import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import academicRegulationModel from "./academicRegulationModel.js";
import gradingModel from "./gradingModel.js";
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";

const academicRegulationAssesmentSchemeModel = sequelize.define(
    'academic_regulation_assesment_scheme',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
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
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'name'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'code'
        },
        evaluationPattern: {
            type: DataTypes.ENUM('INTERNAL_EXTERNAL', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'),
            allowNull: false,
            defaultValue: 'INTERNAL_EXTERNAL',
            field: 'evaluation_pattern'
        },
        gradingSchemeId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: 'grading_scheme_id',
            references: {
                model: gradingModel,
                key: 'grading_id'
            }
        },
        internalWeightage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'internal_weightage'
        },
        externalWeightage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'external_weightage'
        },
        maximumInternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_internal_marks'
        },
        maximumExternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_external_marks'
        },
        minimumInternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_internal_marks'
        },
        minimumExternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_external_marks'
        },
        minimumOverallMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_overall_marks'
        },
        minimumOverallPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_overall_percentage'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
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
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'academic_regulation_assesment_scheme',
        timestamps: true,
        paranoid: true
    }
);

academicRegulationAssesmentSchemeModel.scopeConfig = { university: true, institute: true };

export default academicRegulationAssesmentSchemeModel;
