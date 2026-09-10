import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import curriculumModel from "./curriculumModel.js";
import subjectModel from "./subjectModel.js";
import users from "./userModel.js";

const curriculumSubjectTermMappingModel = sequelize.define(
    'curriculum_subject_term_mapping',
    {
        curriculumSubjectTermMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'curriculum_subject_term_mapping_id'
        },
        curriculumId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'curriculum_id',
            references: {
                model: curriculumModel,
                key: 'curriculum_id'
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
        term: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'term'
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
            allowNull: true,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id'
            }
        }
    },
    {
        tableName: 'curriculum_subject_term_mapping',
        timestamps: true
    }
);

export default curriculumSubjectTermMappingModel;
