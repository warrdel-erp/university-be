import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";
import userModel from "./userModel.js";

const examinationSessionModel = sequelize.define(
    'examination_session',
    {
        examinationSessionId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: 'examination_session_id'
        },
        universityId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        instituteId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        academicYearId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        assessmentTypeId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'assessment_type_id',
            references: {
                model: examSetupTypeModel,
                key: 'exam_setup_type_id'
            }
        },
        sessionName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            field: 'session_name'
        },
        examStartDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'exam_start_date'
        },
        examEndDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'exam_end_date'
        },
        hallTicketReleaseDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'hall_ticket_release_date'
        },
        seatAllocationDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'seat_allocation_date'
        },
        evaluationStartDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'evaluation_start_date'
        },
        evaluationDeadline: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'evaluation_deadline'
        },
        moderationDeadline: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'moderation_deadline'
        },
        resultPublicationDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'result_publication_date'
        },
        autoGenerateSeating: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'auto_generate_seating'
        },
        autoAllocateRooms: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'auto_allocate_rooms'
        },
        autoAssignInvigilators: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'auto_assign_invigilators'
        },
        qrAttendance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'qr_attendance'
        },
        barcodeAnswerSheet: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'barcode_answer_sheet'
        },
        aiEvaluation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'ai_evaluation'
        },
        moderationWorkflow: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'moderation_workflow'
        },
        allowRevaluation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'allow_revaluation'
        },
        status: {
            type: DataTypes.ENUM('Draft', 'Published', 'Completed', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Draft',
            field: 'status'
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'published_at'
        },
        createdBy: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'created_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: userModel,
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
        tableName: 'examination_session',
        timestamps: true,
        paranoid: true
    }
);

examinationSessionModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examinationSessionModel;
