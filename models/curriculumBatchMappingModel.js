import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import curriculumModel from "./curriculumModel.js";
import users from "./userModel.js";

const curriculumBatchMappingModel = sequelize.define(
    'curriculum_batch_mapping',
    {
        curriculumBatchMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'curriculum_batch_mapping_id'
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
        batch: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'batch'
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
        tableName: 'curriculum_batch_mapping',
        timestamps: true
    }
);

export default curriculumBatchMappingModel;
