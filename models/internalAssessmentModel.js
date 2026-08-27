import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";

const internalAssessmentModel = sequelize.define(
    'internal_assessment',
    {
                universityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        examAssessmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_assessment_id'
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id',
            references: {
                model: users,
                key: 'user_id'
            }
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Program term number',
        },
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'exam_setup_type_id',
            references: {
                model: examSetupTypeModel,
                key: 'exam_setup_type_id'
            }
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        totalMarks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field:'total_marks'
        },
        weightage: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        publishDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field:"publish_date"
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field:'due_date'
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        file:{
            type:DataTypes.JSON,
            allowNull:true,
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'internal_assessment',
        timestamps: true,
        paranoid: true
    }
);

internalAssessmentModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default internalAssessmentModel;
