import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js";
import semesterModel from "./semesterModel.js";

export default sequelize.define(
    'internal_assessment',
    {
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
        semesterId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'semester_id',
            references: {
                model: semesterModel,
                key: 'semester_id'
            }
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
            allowNull: false
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
        signature:{
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