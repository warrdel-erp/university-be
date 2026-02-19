import sequelize from "../database/sequelizeConfig.js"
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import courseModel from "./courseModel.js";

export default sequelize.define(
    'time_table_structure',
    {
        timeTableNameId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'time_table_name_id'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        maximumPeriod: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'maximum_period'
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        periodLength: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'period_length'
        },
        periodGap: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'period_gap'
        },
        startingTime: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'starting_time'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at',
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'time_table_structure',
        timestamps: true,
        paranoid: true
    },
);