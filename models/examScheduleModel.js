import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import subjectModel from "./subjectModel.js";
import semesterModel from "./semesterModel.js";

export default sequelize.define(
    'exam_schedule',
    {
        examScheduleId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_schedule_id'
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
        examSetupTypeTermId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_setup_type_term_id',
            references: {
                model: 'exam_setup_type_term',
                key: 'exam_setup_type_term_id'
            }
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: 'acedmic_year',
                key: 'acedmic_year_id'
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: 'session',
                key: 'session_id'
            }
        },
        examDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'exam_date'
        },
        examTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'exam_time'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        duration: {
            type: DataTypes.STRING,
            allowNull: false
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
        tableName: 'exam_schedule',
        timestamps: true,
        paranoid: true
    }
);
