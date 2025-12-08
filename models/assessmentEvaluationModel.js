import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import employeeModel from "./employeeModel.js";
import studentModel from "./studentModel.js";
import internalAssessmentModel from "./internalAssessmentModel.js";

export default sequelize.define(
    'assessment_evalution',
    {
        assessmentEvalutionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'assessment_evalution_id'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subjectModel,
                key: 'subject_id'
            }
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employeeModel,
                key: 'employee_id'
            }
        },
        examAssessmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_assessment_id',
            references: {
                model: internalAssessmentModel,
                key: 'exam_assessment_id'
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
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue:'pending'
        },
        marks: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        comments: {
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
        tableName: 'assessment_evalution',
        timestamps: true,
        paranoid: true
    }
);