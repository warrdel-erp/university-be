import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import acedmicYear from "./acedmicYearModel.js";

export default sequelize.define(
    'exam_type',
    {
        examTypeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'exam_type_id'
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id'
            }
        },
        examName: {
            type: DataTypes.STRING,
            field: 'exam_name',
            allowNull: false
        },
        averagePassingMark: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'average_passing_mark'
        },
        isAveragePassingMark: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: 'is_average_passing_mark'
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
        tableName: 'exam_type',
        timestamps: true,
        paranoid: true
    }
);