import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import acedmicYear from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import courseModel from "./courseModel.js";
import gradingModel from "./gradingModel.js";

const academicRegulationModel = sequelize.define(
    'academic_regulation',
    {
        academicRegulationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_regulation_id'
        },
        regulationCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'regulation_code'
        },
        regulationName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'regulation_name'
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'description'
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        academicYearRange: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'academic_year_range'
        },
        applicableBatch: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'applicable_batch'
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_from'
        },
        effectiveUntil: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_until'
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
        evaluationPattern: {
            type: DataTypes.ENUM('INTERNAL_EXTERNAL', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'),
            allowNull: true,
            field: 'evaluation_pattern'
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
        isInternalAssessmentMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_internal_assessment_mandatory'
        },
        isExternalAssessmentMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_external_assessment_mandatory'
        },
        minimumAttendance: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_attendance'
        },
        isAssessmentCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_assessment_completion_required'
        },
        isPracticalCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_practical_completion_required'
        },
        isProjectSubmissionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_project_submission_required'
        },
        isInternshipCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_internship_completion_required'
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
        mandatoryComponents: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'mandatory_components'
        },
        calculateSGPA: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'calculate_sgpa'
        },
        calculateCGPA: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'calculate_cgpa'
        },
        calculatePercentage: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'calculate_percentage'
        },
        generateClass: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'generate_class'
        },
        generateRank: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'generate_rank'
        },
        tieBreakingMethod: {
            type: DataTypes.ENUM('HIGHER_CGPA', 'HIGHER_SGPA', 'HIGHER_INTERNAL_MARKS', 'HIGHER_EXTERNAL_MARKS', 'ALPHABETICAL', 'RANDOM'),
            allowNull: true,
            field: 'tie_breaking_method'
        },
        version: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: false,
            defaultValue: 1.0,
            field: 'version'
        },
        status: {
            type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
            allowNull: false,
            defaultValue: 'DRAFT',
            field: 'status'
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
        tableName: 'academic_regulation',
        timestamps: true,
        paranoid: true
    }
);

academicRegulationModel.scopeConfig = { university: true, institute: true };

export default academicRegulationModel;
