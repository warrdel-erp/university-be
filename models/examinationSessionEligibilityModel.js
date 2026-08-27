import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import studentModel from "./studentModel.js";
import examinationSessionModel from "./examinationSessionModel.js";
import userModel from "./userModel.js";

const examinationSessionEligibilityModel = sequelize.define(
    'examination_session_eligibility',
    {
        examinationSessionEligibilityId: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            field: 'examination_session_eligibility_id'
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
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
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: studentModel,
                key: 'student_id'
            }
        },
        examinationSessionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'examination_session_id',
            references: {
                model: examinationSessionModel,
                key: 'examination_session_id'
            }
        },
        status: {
            type: DataTypes.ENUM('READY', 'REVIEW', 'BLOCKED', 'APPROVED'),
            allowNull: false,
            defaultValue: 'REVIEW',
            field: 'status'
        },
        reviewReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'review_reason'
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'remarks'
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'approved_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        approvedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'approved_at'
        },
        blockedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'blocked_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        blockedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'blocked_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            references: {
                model: userModel,
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        }
    },
    {
        tableName: 'examination_session_eligibility',
        timestamps: true,
        paranoid: false, // assuming not paranoid as requested fields only list created/updated
        indexes: [
            {
                unique: true,
                fields: ['student_id', 'examination_session_id'],
                name: 'idx_unique_exam_session_student_eligibility'
            }
        ]
    }
);

examinationSessionEligibilityModel.scopeConfig = {
    university: true,
    institute: true,
    academicYear: true
};

export default examinationSessionEligibilityModel;
