import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import acedmicYear from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import session from "./sessionModel.js";
import examSetupTypeModel from "./examSetupTypeModel.js"

export default sequelize.define(
    'exam_structure_schedule_mapper',
    {
        examStructureScheduleMapperId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_structure_schedule_mapper_id'
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
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: session,
                key: 'session_id'
            }
        },
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_setup_type_id',
            references: {
                model: examSetupTypeModel,
                key: 'exam_setup_type_id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        startingDate:{
            type:DataTypes.DATEONLY,
            allowNull:true
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
        tableName: 'exam_structure_schedule_mapper',
        timestamps: true,
        paranoid: true
    }
);