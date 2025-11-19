import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import acedmicYear from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import course from "./courseModel.js";
import sessionModel from "./sessionModel.js";

export default sequelize.define(
    'exam_structure',
    {
        examStructureId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_structure_id'
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id'
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
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
                model: university,
                key: 'university_id'
            }
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: course,
                key: 'course_id'
            }
        },
        examScheduling:{
            type:DataTypes.STRING,
            field:'exam_scheduling',
            allowNull:false
        },
        jury:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        internal:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        external:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        permission:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        totalMarks:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'total_marks'
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
        tableName: 'exam_structure',
        timestamps: true,
        paranoid: true
    }
);