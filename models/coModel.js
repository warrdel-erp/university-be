import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from './universityModel.js';
import institute from './instituteModel.js';
import users from "./userModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import syllabusDetailsModel from "./syllabusDetailsModel.js";
import subjectModel from "./subjectModel.js";

export default sequelize.define(
    'co',
    {
        coId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'co_id'
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id'
            }
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
                key: 'acedmic_year_id'
            }
        },
        syllabusDetailsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'syllabus_details_id',
            references: {
                model: syllabusDetailsModel,
                key: 'syllabus_details_id'
            }
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
        cosNumber:{
            type:DataTypes.STRING,
            allowNull:true,
            field:'cos_number'
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'co',
        timestamps: true,
        paranoid: true
    }
);