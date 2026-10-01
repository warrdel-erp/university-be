import sequelize from '../database/sequelizeConfig.js';
import { DataTypes } from 'sequelize';
import curriculumBatchTermMappingModel from './curriculumBatchTermMappingModel.js';
import universityModel from './universityModel.js';
import instituteModel from './instituteModel.js';
import userModel from './userModel.js';

const previousAcademicUploadLogModel = sequelize.define(
  'previous_academic_upload_log',
  {
    previousAcademicUploadLogId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'previous_academic_upload_log_id',
    },
    curriculumBatchTermMappingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'curriculum_batch_term_mapping_id',
      references: {
        model: curriculumBatchTermMappingModel,
        key: 'curriculum_batch_term_mapping_id',
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'session_id',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'file_name',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size',
    },
    fileData: {
      type: DataTypes.BLOB('long'),
      allowNull: true,
      field: 'file_data',
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED'),
      allowNull: false,
      field: 'status',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    entriesCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'entries_created',
    },
    entriesUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'entries_updated',
    },
    universityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'university_id',
      references: {
        model: universityModel,
        key: 'university_id',
      },
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'institute_id',
      references: {
        model: instituteModel,
        key: 'institute_id',
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    tableName: 'previous_academic_upload_log',
    timestamps: true,
    paranoid: true,
  }
);

previousAcademicUploadLogModel.scopeConfig = {
  university: true,
  institute: true,
};

export default previousAcademicUploadLogModel;
