import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";

const acedmicYearModel = sequelize.define(
    'acedmic_year',
    {
        acedmicYearId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'acedmic_year_id'
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
                model: instituteModel,
                key: 'institute_id'
            }
        },
        yearTitle: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'year_title'
        },
        startingDate: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'starting_date'
        },
        endingDate: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'ending_date'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: 'is_active',
            defaultValue: false
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
        tableName: 'acedmic_year',
        timestamps: true,
        paranoid: true
    }
);


acedmicYearModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default acedmicYearModel;
