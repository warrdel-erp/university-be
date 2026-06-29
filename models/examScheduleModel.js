import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";

const examScheduleModel = sequelize.define(
    'exam_schedule',
    {
        examScheduleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_schedule_id'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'subject_id',
            references: {
                model: subjectModel,
                key: 'subject_id'
            }
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Program term number',
        },
        examSetupTypeTermId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_setup_type_term_id',
            references: {
                model: 'exam_setup_type_term',
                key: 'exam_setup_type_term_id'
            }
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: 'acedmic_year',
                key: 'acedmic_year_id'
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: 'session',
                key: 'session_id'
            }
        },
        examDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'exam_date'
        },
        examTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'exam_time'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        duration: {
            type: DataTypes.STRING,
            allowNull: false
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
        answerSheetS3FileId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'answer_sheet_s3_file_id',
            references: {
                model: 's3_files',
                key: 'id'
            }
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'exam_schedule',
        timestamps: true,
        paranoid: true,
    }
);

examScheduleModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examScheduleModel;
