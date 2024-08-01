import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import subject from "./subjectModel.js";
import student from "./studentModel.js"

export default sequelize.define(
    'subject_mapper',
    {
        subjectMapperId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'subject_mapper_id'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
            }
        },
        batch: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        semester: {
            type: DataTypes.STRING,
            allowNull: true,
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
        },
    },
    {
        tableName: 'subject_mapper',
        timestamps: true,
        paranoid: true
    }
);