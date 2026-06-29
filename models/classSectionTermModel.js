import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import classSectionModel from "./classSectionModel.js";
import university from "./universityModel.js";
import instituteModel from "./instituteModel.js";
import users from "./userModel.js";

const classSectionTermModel = sequelize.define(
    'class_section_term',
    {
        classSectionTermId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'class_section_term_id'
        },
        classSectionsId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_sections_id',
            references: {
                model: classSectionModel,
                key: 'class_sections_id'
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Program term number (1..totalTerms from course termType)',
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'class_section_term',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['class_sections_id', 'term'],
                name: 'class_section_term_sections_id_term_unique',
            },
        ],
    }
);

classSectionTermModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default classSectionTermModel;
