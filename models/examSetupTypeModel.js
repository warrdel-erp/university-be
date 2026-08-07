import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

const examSetupTypeModel = sequelize.define(
    'exam_setup_type', // exam Type 1.1
    {
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_setup_type_id'
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        examName: {
            type: DataTypes.STRING(100),
            field: 'exam_name',
            allowNull: true
        },
        examCode: {
            type: DataTypes.STRING(30),
            field: 'exam_code',
            allowNull: true
        },
        examCategory: {
            type: DataTypes.STRING(100),
            field: 'exam_category',
            allowNull: true
        },
        examSubcategory: {
            type: DataTypes.STRING(100),
            field: 'exam_subcategory',
            allowNull: true
        },
        examDescription: {
            type: DataTypes.STRING(500),
            field: 'exam_description',
            allowNull: true
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
        tableName: 'exam_setup_type',
        timestamps: true,
        paranoid: true
    }
);

examSetupTypeModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default examSetupTypeModel;
