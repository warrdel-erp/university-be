import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import examSetupTypeTerm from "./examSetupTypeTermModel.js";
import subject from "./subjectModel.js";
import session from "./sessionModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'subject_weightage',
    {
        subjectWeightageId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'subject_weightage_id'
        },
        examSetupTypeTermId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_setup_type_term_id',
            references: {
                model: examSetupTypeTerm,
                key: 'exam_setup_type_term_id'
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
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: session,
                key: 'session_id'
            }
        },
        weightage: {
            type: DataTypes.FLOAT,
            allowNull: false,
            field: 'weightage'
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
        tableName: 'subject_weightage',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['exam_setup_type_term_id', 'subject_id'],
                where: {
                    deleted_at: null
                }
            }
        ]
    }
);
