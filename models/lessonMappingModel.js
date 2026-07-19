import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import topicModel from "./topicModel.js";
import timeTableCellModel from "./timeTableCellModel.js";
import timeTableCellDateWiseModel from "./timeTableCellDateWiseModel.js";
import universityModel from "./universityModel.js";

/**
 * Topic taught in a dated class period.
 * Period key: timeTableCellDateWiseId.
 * timeTableCellId is denormalized week-cell PK (dual-write).
 */
const lessonMappingModel = sequelize.define(
    'lesson_mapping',
    {
        lessonMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'lesson_mapping_id'
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: universityModel,
                key: 'university_id'
            }
        },
        topicId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'topic_id',
            references: {
                model: topicModel,
                key: 'topic_id'
            }
        },
        timeTableCellDateWiseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'time_table_cell_date_wise_id',
            references: {
                model: timeTableCellDateWiseModel,
                key: 'time_table_cell_date_wise_id'
            }
        },
        timeTableCellId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_cell_id',
            references: {
                model: timeTableCellModel,
                key: 'time_table_cell_id'
            }
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        completeDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'complete_date'
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lectureUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'lecture_url'
        },
        file: {
            type: DataTypes.JSON,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'inComplete',
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
        tableName: 'lesson_mapping',
        timestamps: true,
        paranoid: true
    }
);

lessonMappingModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default lessonMappingModel;
