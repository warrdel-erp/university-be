import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import examStructureModel from "./examStructureModel.js";
import universityModel from "./universityModel.js";
import instituteModel from "./instituteModel.js";

export default sequelize.define(
    'exam_setup_type', // exam Type 1.1
    {
        examSetupTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_setup_type_id'
        },
        examStructureId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_structure_id',
            references: {
                model: examStructureModel,
                key: 'exam_structure_id'
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
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        examType: {
            type: DataTypes.STRING,
            field: 'exam_type',
            allowNull: true
        },
        maximumAssessment: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_assessment'
        },
        examName: {
            type: DataTypes.STRING,
            field: 'exam_name',
            allowNull: true
        },
        scheduledBy: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'scheduled_by'
        },
        isPublish: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_publish'
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
        paranoid: true,
        hooks: {
            beforeValidate: async (examSetupType, options) => {
                if (examSetupType.examStructureId && (!examSetupType.universityId || !examSetupType.instituteId)) {
                    const examStructure = await examStructureModel.findByPk(examSetupType.examStructureId);
                    if (examStructure) {
                        examSetupType.universityId = examStructure.universityId;
                        examSetupType.instituteId = examStructure.instituteId;
                    }
                }
            }
        }
    }
);