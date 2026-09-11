import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import curriculumBatchMappingModel from "./curriculumBatchMappingModel.js";
import users from "./userModel.js";

const curriculumBatchTermMappingModel = sequelize.define(
    'curriculum_batch_term_mapping',
    {
        curriculumBatchTermMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'curriculum_batch_term_mapping_id'
        },
        curriculumBatchMappingId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'curriculum_batch_mapping_id',
            references: {
                model: curriculumBatchMappingModel,
                key: 'curriculum_batch_mapping_id'
            },
            onDelete: 'CASCADE'
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'term'
        },
        yearNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'year_number'
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'year'
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
        tableName: 'curriculum_batch_term_mapping',
        timestamps: true
    }
);

export default curriculumBatchTermMappingModel;
