import { DataTypes } from 'sequelize';
import sequelize from "../database/sequelizeConfig.js";
import acedmicYearModel from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";
import studentModel from "./studentModel.js";
import universityModel from "./universityModel.js";
import examinationSessionModel from './examinationSessionModel.js';

const studentHallTicketModel = sequelize.define(
    "student_hall_ticket",
    {
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: "id"
        },
        qr: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: "qr"
        },
        examinationSessionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "examination_session_id",
            references: {
                model: examinationSessionModel,
                key: "examination_session_id"
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "acedmic_year_id",
            references: {
                model: acedmicYearModel,
                key: "acedmic_year_id"
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "student_id",
            references: {
                model: studentModel,
                key: "student_id"
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "institute_id",
            references: {
                model: instituteModel,
                key: "institute_id"
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "university_id",
            references: {
                model: universityModel,
                key: "university_id"
            }
        },
        isBlocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "is_blocked"
        },
        isPublished: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "is_published"
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "published_at"
        },
        blockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "blocked_at"
        },
        previousEligibilityStatus: {
            type: DataTypes.STRING,
            allowNull: true,
            field: "previous_eligibility_status"
        },
        markAsEligible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "mark_as_eligible"
        },
        markedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "marked_by",
            references: {
                model: "users",
                key: "user_id"
            }
        },
        markedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "marked_at"
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "created_at"
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
            field: "updated_at"
        }
    },
    {
        tableName: "student_hall_ticket",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["examination_session_id", "student_id"]
            },
            /** Scope hall-ticket counts/lists by institute. */
            {
                name: "student_hall_ticket_inst_univ_exam_session_idx",
                fields: ["institute_id", "university_id", "examination_session_id", "acedmic_year_id"]
            },
            /** GET /byQr — equality on qr within tenant. */
            {
                name: "student_hall_ticket_qr_idx",
                fields: ["qr"]
            }
        ]
    }
);

studentHallTicketModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default studentHallTicketModel;
