import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import topicModel from "./topicModel.js";
import timeTableMappingModel from "./timeTableMappingModel.js";
import universityModel from "./universityModel.js";

export default sequelize.define(
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
        timeTableMappingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'time_table_mapping_id',
            references: {
                model: timeTableMappingModel,
                key: 'time_table_mapping_id'
            }
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        completeDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field:'complete_date'
        },
        note :{
            type:DataTypes.STRING,
            allowNull:true
        },
        lectureUrl :{
            type:DataTypes.STRING,
            allowNull:true,
            field:'lecture_url'
        },
        file:{
            type:DataTypes.JSON,
            allowNull:true
        },
        status:{
            type:DataTypes.STRING,
            allowNull:false,
            defaultValue:'inComplete',
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