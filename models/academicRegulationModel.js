import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import courseModel from "./courseModel.js";
import sessionModel from "./sessionModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
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
        // Direct linked Course ID (1-to-1 connection)
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        // Direct linked Session ID (1-to-1 connection)
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
        },
        // Linked Academic Year ID in which this regulation was created/applicable
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
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
        // STEP 6: CREDIT REQUIREMENTS
        // ==========================================
        // Total credits required to complete the degree/program
        totalCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'total_credits'
        },
        // Core course mandatory credits requirement
        coreCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'core_credits'
        },
        // Elective course credits requirement
        electiveCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'elective_credits'
        },
        // Open elective course credits requirement
        openElectiveCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'open_elective_credits'
        },
        // Mandatory internship credits
        internshipCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'internship_credits'
        },
        // Mandatory project / dissertation credits
        projectCredits: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'project_credits'
        },

        // ==========================================
        // STEP 7: PROMOTION & ATKT RULES
        // ==========================================
        // Flag to enable Allowed To Keep Term (ATKT) system
        isAtktEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_atkt_enabled'
        },
        // Maximum allowed failing subjects under ATKT to qualify for promotion
        maximumAtktSubjects: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_atkt_subjects'
        },
        // Flag enabling carry forward of backlog subjects to next term
        isCarryForwardEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_carry_forward_enabled'
        },
        // Maximum allowed subjects permitted for carry forward
        maximumCarryForwardSubjects: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_carry_forward_subjects'
        },
        // Academic promotion evaluation method: YEAR_WISE | SEMESTER_WISE | TERM_WISE
        promotionMethod: {
            type: DataTypes.ENUM('YEAR_WISE', 'SEMESTER_WISE', 'TERM_WISE'),
            allowNull: true,
            field: 'promotion_method'
        },

        // ==========================================
        // STEP 8: IMPROVEMENT RULES
        // ==========================================
        // Flag allowing grade/marks improvement re-examinations
        isImprovementAllowed: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_improvement_allowed'
        },
        // Maximum allowed re-examination attempts for improvement
        maximumImprovementAttempts: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_improvement_attempts'
        },
        // Criteria for considering marks after improvement attempt: HIGHEST | LATEST
        improvementMarksConsidered: {
            type: DataTypes.ENUM('HIGHEST', 'LATEST'),
            allowNull: true,
            field: 'improvement_marks_considered'
        },

        // ==========================================
        // STEP 9: BACKLOG & SUPPLEMENTARY RULES
        // ==========================================
        // Flag allowing backlog examination attempts for failed subjects
        isBacklogAllowed: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_backlog_allowed'
        },
        // Maximum allowed backlog examination attempts per subject
        maximumBacklogAttempts: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_backlog_attempts'
        },
        // Flag permitting supplementary/re-sit exams in same academic session
        isSupplementaryAllowed: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_supplementary_allowed'
        },
        // Validity period in years within which backlogs must be cleared
        backlogValidityYears: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'backlog_validity_years'
        },

        // ==========================================
        // STEP 10: GRADUATION & DEGREE COMPLETION REQUIREMENTS
        // ==========================================
        // Total cumulative credits required to qualify for degree award
        totalCreditsRequired: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'total_credits_required'
        },
        // Minimum cumulative GPA required to be awarded the degree (e.g. 5.00)
        minimumCgpa: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            field: 'minimum_cgpa'
        },
        // Mandatory completion flag for internship program
        isInternshipMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_internship_mandatory'
        },
        // Mandatory completion flag for major degree project
        isProjectMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_project_mandatory'
        },
        // Mandatory completion flag for capstone project/thesis
        isCapstoneMandatory: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_capstone_mandatory'
        },
        // Mandatory requirement to clear comprehensive exit examination
        isExitExaminationRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_exit_examination_required'
        },
        // Requirement for zero active failing backlog subjects at degree award time
        isNoActiveBacklogsRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_no_active_backlogs_required'
        },
        // Requirement for complete clearance of university fee dues
        isNoPendingFeesRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_no_pending_fees_required'
        },
        // Requirement for clean disciplinary record without active holds
        isNoDisciplinaryHoldRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_no_disciplinary_hold_required'
        },
        // Minimum overall program attendance percentage required for degree (e.g. 75.00)
        minimumDegreeAttendancePercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_degree_attendance_percentage'
        },

        // ==========================================
        // STEP 12: CERTIFICATES & TRANSCRIPT GENERATION RULES
        // ==========================================
        // ID referencing Marksheet template
        marksheetTemplateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'marksheet_template_id'
        },
        // ID referencing Official Transcript template
        transcriptTemplateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'transcript_template_id'
        },
        // ID referencing Final Degree Certificate template
        degreeCertificateTemplateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'degree_certificate_template_id'
        },
        // ID referencing Provisional Degree Certificate template
        provisionalCertificateTemplateId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'provisional_certificate_template_id'
        },
        // Flag to auto-generate transcript upon degree qualification
        isGenerateTranscriptAutomatically: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_generate_transcript_automatically'
        },
        // Flag to auto-generate marksheet upon semester result publication
        isGenerateMarksheetAutomatically: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
            field: 'is_generate_marksheet_automatically'
        },
        // Flag requiring cryptographic digital signature on documents
        isDigitalSignatureRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_digital_signature_required'
        },
        // Flag enabling QR code verification link/barcode on certificates
        isQrVerificationEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_qr_verification_enabled'
        },
        // Serial/document number prefix string for marksheets (e.g. "MS-2026-")
        marksheetPrefix: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'marksheet_prefix'
        },
        // Serial/document number prefix string for transcripts (e.g. "TR-2026-")
        transcriptPrefix: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'transcript_prefix'
        },
        // Serial/document number prefix string for degree certificates (e.g. "DG-2026-")
        degreePrefix: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'degree_prefix'
        },
        // Flag enabling automatic sequential document numbering
        isAutoNumberingEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            field: 'is_auto_numbering_enabled'
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
        paranoid: false
    }
);

academicRegulationModel.scopeConfig = { university: true, institute: true };

export default academicRegulationModel;
