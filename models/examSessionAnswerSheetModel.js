import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import examinationSessionModel from './examinationSessionModel.js';
import s3FileModel from './s3FileModel.js';
import userModel from './userModel.js';
import universityModel from './universityModel.js';
import instituteModel from './instituteModel.js';

const examSessionAnswerSheetModel = sequelize.define(
    'exam_session_answer_sheets',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        examinationSessionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'examination_session_id',
            references: {
                model: examinationSessionModel,
                key: 'examination_session_id',
            },
        },
        s3FileId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 's3_file_id',
            references: {
                model: s3FileModel,
                key: 'id',
            },
        },
        instituteId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id',
            },
        },
        universityId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id',
            },
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: userModel,
                key: 'user_id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at',
        },
    },
    {
        tableName: 'exam_session_answer_sheets',
        timestamps: true,
    }
);

examSessionAnswerSheetModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default examSessionAnswerSheetModel;
