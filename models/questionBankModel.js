import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import university from "./universityModel.js";
import users from "./userModel.js";
import subject from "./subjectModel.js";

export default sequelize.define(
    'questionBank',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'id'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'type'
        },
        difficulty: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'difficulty'
        },
        bloom: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'bloom'
        },
        marks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'marks'
        },
        question: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'question'
        },
        Answer: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'answer'
        },
        content: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'content'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
            }
        },
        status: {
            type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
            allowNull: false,
            defaultValue: 'Pending',
            field: 'status'
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
        tableName: 'question_bank',
        timestamps: true,
        paranoid: false
    }
);
