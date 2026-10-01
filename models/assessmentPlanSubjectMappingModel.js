import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const assessmentPlanSubjectMappingModel = sequelize.define(
    'assessment_plan_subject_mapping',
    {
        assessmentPlanSubjectMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'assessment_plan_subject_mapping_id'
        },
        assessmentPlanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'assessment_plan_id',
            references: {
                model: 'assessment_plan',
                key: 'assessment_plan_id'
            }
        },
        batchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'batch_id',
            references: {
                model: 'batch',
                key: 'batch_id'
            }
        },
        curriculumSubjectTermMappingId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'curriculum_subject_term_mapping_id',
            references: {
                model: 'curriculum_subject_term_mapping',
                key: 'curriculum_subject_term_mapping_id'
            }
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: 'subject',
                key: 'subject_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: 'university',
                key: 'university_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: 'institute',
                key: 'institute_id'
            }
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'created_by',
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'updated_by',
            references: {
                model: 'users',
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
        tableName: 'assessment_plan_subject_mapping',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                name: 'unique_batch_cstm_plan',
                fields: ['batch_id', 'curriculum_subject_term_mapping_id', 'assessment_plan_id']
            }
        ]
    }
);

assessmentPlanSubjectMappingModel.scopeConfig = { university: true, institute: true };

export default assessmentPlanSubjectMappingModel;
