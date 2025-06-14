import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from './universityModel.js';
import institute from './instituteModel.js';
import users from "./userModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import coModel from "./coModel.js";

export default sequelize.define(
    'co_weightage',
    {
        coWeightageId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'co_weightage_id'
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
        coId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'co_id',
            references: {
                model: coModel,
                key: 'co_id'
            }
        },
        term:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        total :{
            type:DataTypes.INTEGER,
            allowNull:true,
        },
        name:{
            type:DataTypes.STRING,
            allowNull:true
        },
        mark:{
            type:DataTypes.INTEGER,
            allowNull:true
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
        tableName: 'co_weightage',
        timestamps: true,
        paranoid: true
    }
);