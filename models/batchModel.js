import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import sessionModel from "./sessionModel.js";
import users from "./userModel.js";

const batchModel = sequelize.define(
    'batch',
    {
        batchId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'batch_id'
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
        },
        batch: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'batch'
        },
        /**
         * Lifecycle status for this batch entity.
         * - 'draft'     : batch is being configured; cannot yet be used in curriculum mappings.
         * - 'published' : batch is active and immutable (core fields cannot be changed).
         */
        status: {
            type: DataTypes.ENUM('draft', 'published'),
            allowNull: false,
            defaultValue: 'draft',
            field: 'status'
        },
        /**
         * Academic year in which students of this batch were admitted (e.g. "2024-25").
         */

        /**
         * Maximum number of students allowed in this batch (optional).
         */
        intakeCapacity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'intake_capacity'
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
        tableName: 'batch',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['session_id', 'batch'],
                name: 'unique_session_batch'
            }
        ]
    }
);

/** Fields that must not change once a batch is published. */
const IMMUTABLE_WHEN_PUBLISHED = ['sessionId', 'batch'];

/**
 * Guard: published batches are immutable for their core identity fields.
 * Allow status changes (draft→published) and mutable fields (intakeCapacity).
 */
batchModel.beforeUpdate(async (instance) => {
    if (instance.previous('status') === 'published') {
        for (const field of IMMUTABLE_WHEN_PUBLISHED) {
            if (instance.changed(field)) {
                const err = new Error(
                    `Cannot change '${field}' on a published batch. Published batches are immutable.`
                );
                err.statusCode = 400;
                throw err;
            }
        }
    }
});

export default batchModel;
