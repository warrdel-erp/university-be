import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const assessmentPlanModel = sequelize.define(
    'assessment_plan',
    {
        assessmentPlanId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'assessment_plan_id'
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'session_id',
            references: {
                model: 'session',
                key: 'session_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: 'acedmic_year',
                key: 'acedmic_year_id'
            }
        },
        planName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'plan_name'
        },
        planCode: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'plan_code'
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
                model: 'course',
                key: 'course_id'
            }
        },
        regulationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'regulation_id',
            references: {
                model: 'academic_regulation',
                key: 'academic_regulation_id'
            }
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'term'
        },
        gradingId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: 'grading_id',
            references: {
                model: 'grading',
                key: 'grading_id'
            }
        },
        status: {
            type: DataTypes.ENUM('Draft', 'Published'),
            allowNull: false,
            defaultValue: 'Draft',
            field: 'status'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
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
        tableName: 'assessment_plan',
        timestamps: true,
        paranoid: true
    }
);

assessmentPlanModel.scopeConfig = { university: true, institute: true };

export default assessmentPlanModel;
