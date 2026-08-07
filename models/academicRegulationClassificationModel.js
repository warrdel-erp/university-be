import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import academicRegulationModel from "./academicRegulationModel.js";
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";

const academicRegulationClassificationModel = sequelize.define(
    'academic_regulation_classification',
    {
        academicRegulationClassificationId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_regulation_classification_id'
        },
        academicRegulationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'academic_regulation_id',
            references: {
                model: academicRegulationModel,
                key: 'academic_regulation_id'
            }
        },
        classificationName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'classification_name'
        },
        minimumCgpa: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            field: 'minimum_cgpa'
        },
        minimumPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'minimum_percentage'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 1,
            field: 'sort_order'
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
        tableName: 'academic_regulation_classification',
        timestamps: true,
        paranoid: true
    }
);

academicRegulationClassificationModel.scopeConfig = { university: true, institute: true };

export default academicRegulationClassificationModel;
