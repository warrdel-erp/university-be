import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import courseModel from "./courseModel.js";
import gradingModel from "./gradingModel.js";

const academicRegulationModel = sequelize.define(
    'academic_regulation',
    {
        // ==========================================
        // PRIMARY KEY & METADATA
        // ==========================================
        academicRegulationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_regulation_id'
        },

        // ==========================================
        // STEP 1: BASIC INFORMATION
        // ==========================================
        // Unique code representing the regulation (e.g. "REG-2026-CS")
        regulationCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'regulation_code'
        },
        // Display name of the regulation (e.g. "Computer Science Academic Regulation 2026")
        regulationName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'regulation_name'
        },
        // Detailed description of regulation scope and policies
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'description'
        },
        // Specific course/program ID if course-scoped, null if institute-wide
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        // Academic year range string (e.g. "2024-2029", "2026-2030")
        academicYearRange: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'academic_year_range'
        },
        // Applicable student batch range (e.g. "2026 Batch", "2024-2028")
        applicableBatch: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'applicable_batch'
        },
        // Effective start date for the regulation
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_from'
        },
        // Effective end date for the regulation
        effectiveUntil: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'effective_until'
        },
        // Foreign key referencing linked Grading Scheme ID
        gradingSchemeId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: 'grading_scheme_id',
            references: {
                model: gradingModel,
                key: 'grading_id'
            }
        },

        // ==========================================
        // STEP 2: EVALUATION PATTERN & WEIGHTAGE
        // ==========================================
        // Pattern of evaluation: INTERNAL_EXTERNAL | INTERNAL_ONLY | EXTERNAL_ONLY
        evaluationPattern: {
            type: DataTypes.ENUM('INTERNAL_EXTERNAL', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'),
            allowNull: true,
            field: 'evaluation_pattern'
        },
        // Internal evaluation weightage percentage (e.g. 40.00)
        internalWeightage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'internal_weightage'
        },
        // External evaluation weightage percentage (e.g. 60.00)
        externalWeightage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'external_weightage'
        },
        // Maximum internal assessment marks allocation (e.g. 40)
        maximumInternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_internal_marks'
        },
        // Maximum external examination marks allocation (e.g. 60)
        maximumExternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_external_marks'
        },
        // Flag indicating if internal assessment is mandatory for eligibility
        isInternalAssessmentMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_internal_assessment_mandatory'
        },
        // Flag indicating if external assessment is mandatory for eligibility
        isExternalAssessmentMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_external_assessment_mandatory'
        },

        // ==========================================
        // STEP 3: PASSING RULES & ELIGIBILITY CRITERIA
        // ==========================================
        // Minimum attendance percentage required for exam eligibility (e.g. 75.00)
        minimumAttendance: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_attendance'
        },
        // Flag indicating whether all internal continuous assessments must be completed
        isAssessmentCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_assessment_completion_required'
        },
        // Flag indicating whether practical/lab evaluations must be completed
        isPracticalCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_practical_completion_required'
        },
        // Flag indicating whether capstone/project submissions must be completed
        isProjectSubmissionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_project_submission_required'
        },
        // Flag indicating whether internship requirements must be completed
        isInternshipCompletionRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            field: 'is_internship_completion_required'
        },
        // Minimum overall absolute marks required to pass (e.g. 40)
        minimumOverallMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_overall_marks'
        },
        // Minimum overall percentage required to pass (e.g. 40.00)
        minimumOverallPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_overall_percentage'
        },
        // Minimum internal assessment marks required to pass (e.g. 16)
        minimumInternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_internal_marks'
        },
        // Minimum external examination marks required to pass (e.g. 24)
        minimumExternalMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'minimum_external_marks'
        },
        // Array of mandatory components required to clear subject (e.g. ["THEORY", "PRACTICAL", "VIVA"])
        mandatoryComponents: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'mandatory_components'
        },

        // ==========================================
        // STEP 4: GPA & RANKING RULES
        // ==========================================
        // Flag to calculate Semester Grade Point Average (SGPA)
        calculateSGPA: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'calculate_sgpa'
        },
        // Flag to calculate Cumulative Grade Point Average (CGPA)
        calculateCGPA: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'calculate_cgpa'
        },
        // Flag to calculate overall percentage alongside GPA
        calculatePercentage: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'calculate_percentage'
        },
        // Flag to generate degree class / division (First Class, Distinction, etc.)
        generateClass: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'generate_class'
        },
        // Flag to calculate merit position / rank for students
        generateRank: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'generate_rank'
        },
        // Tie-breaking method for rank generation: HIGHER_CGPA | HIGHER_SGPA | HIGHER_INTERNAL_MARKS | HIGHER_EXTERNAL_MARKS | ALPHABETICAL | RANDOM
        tieBreakingMethod: {
            type: DataTypes.ENUM('HIGHER_CGPA', 'HIGHER_SGPA', 'HIGHER_INTERNAL_MARKS', 'HIGHER_EXTERNAL_MARKS', 'ALPHABETICAL', 'RANDOM'),
            allowNull: true,
            field: 'tie_breaking_method'
        },

        // ==========================================
        // STEP 5: MODERATION, GRACE MARKS & RESULT RULES
        // ==========================================
        // Flag enabling result moderation processing
        isModerationEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_moderation_enabled'
        },
        // Flag enabling mark scaling rules
        isScalingEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_scaling_enabled'
        },
        // Flag enabling normalization algorithms across batches
        isNormalizationEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_normalization_enabled'
        },
        // Flag enabling grace mark allocation for borderline failing students
        isGraceMarksEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_grace_marks_enabled'
        },
        // Maximum grace marks limit per student (e.g. 5)
        maximumGraceMarks: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 5,
            field: 'maximum_grace_marks'
        },
        // Evaluation boundary for grace mark application: OVERALL | EXTERNAL | INTERNAL
        graceApplicableTo: {
            type: DataTypes.ENUM('OVERALL', 'EXTERNAL', 'INTERNAL'),
            allowNull: true,
            field: 'grace_applicable_to'
        },
        // Flag permitting result withholding for fee or discipline holds
        allowWithheldResult: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'allow_withheld_result'
        },
        // Flag freezing result data post-publication against accidental edits
        resultFreeze: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'result_freeze'
        },
        // Flag permitting re-evaluation / result revision post publication
        allowResultRevision: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'allow_result_revision'
        },
        // Flag to auto-publish results upon approval workflow completion
        publishAutomatically: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'publish_automatically'
        },
        // Flag requiring multi-level formal approval before publishing results
        approvalRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'approval_required'
        },

        // ==========================================
        // SYSTEM AUDIT & STATUS CONTROL
        // ==========================================
        // Version number (increments by +0.1 on updates: 1.0 -> 1.1)
        version: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: false,
            defaultValue: 1.0,
            field: 'version'
        },
        // Workflow lifecycle status: DRAFT | PUBLISHED | ARCHIVED
        status: {
            type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
            allowNull: false,
            defaultValue: 'DRAFT',
            field: 'status'
        },
        // Soft active status toggle
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },
        // Multi-tenant institute reference (auto-filled from user session)
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        // Multi-tenant university reference (auto-filled from user session)
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        // User ID of regulation creator
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        // User ID of last modifier
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
