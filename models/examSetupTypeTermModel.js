import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import examSetupTypeModel from "./examSetupTypeModel.js";
import acedmicYearModel from "./acedmicYearModel.js";
import instituteModel from "./instituteModel.js";
import universityModel from "./universityModel.js";
import courseModel from "./courseModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'examSetupTypeTerm',
    {
        examSetupTypeTermId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_setup_type_term_id'
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
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYearModel,
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
                model: universityModel,
                key: 'university_id'
            }
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'term'
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
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

    },
    {
        tableName: 'exam_setup_type_term',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['exam_setup_type_id', 'term', 'course_id']
            }
        ]
    }
);
