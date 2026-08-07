import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';

const assessmentPlanComponentModel = sequelize.define(
    'assessment_plan_component',
    {
        assessmentPlanComponentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'assessment_plan_component_id'
        },
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'exam_setup_type_id',
            references: {
                model: 'exam_setup_type',
                key: 'exam_setup_type_id'
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
        assessmentPlanId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'assessment_plan_id',
            references: {
                model: 'assessment_plan',
                key: 'assessment_plan_id'
            }
        },
        evaluationBy: {
            type: DataTypes.ENUM('Faculty', 'CoE', 'External'),
            allowNull: false,
            defaultValue: 'Faculty',
            field: 'evaluation_by'
        },
        weightagePercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: 'weightage_percentage'
        },
        maxAssessments: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            field: 'max_assessments'
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
        tableName: 'assessment_plan_component',
        timestamps: true,
        paranoid: true
    }
);

assessmentPlanComponentModel.scopeConfig = { university: true, institute: true };

export default assessmentPlanComponentModel;
