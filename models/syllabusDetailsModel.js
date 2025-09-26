import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import syllabus from './syllabusModel.js';
import users from './userModel.js';
import subject from './subjectModel.js';
import examSetupType from "./examSetupTypeModel.js";

export default sequelize.define(
    'syllabus_details',
    {
        syllabusDetailsId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'syllabus_details_id'
        },
        syllabusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'syllabus_id',
            references: {
                model: syllabus,
                key: 'syllabus_id'
            }
        },
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_setup_type_id',
            references: {
                model: examSetupType,
                key: 'exam_setup_type_id'
            }
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
            }
        },
        subjectType: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'subject_type'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        marks: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        total: {
            type: DataTypes.STRING,
            allowNull: false,
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
        tableName: 'syllabus_details',
        timestamps: true,
        paranoid: true
    }
);