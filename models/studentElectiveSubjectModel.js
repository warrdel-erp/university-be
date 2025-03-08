import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import student from "./studentModel.js";
import subject from "./subjectModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'student_elective_subject',
    {
        studentElectiveSubjectId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'student_elective_subject_id'
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
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
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
        tableName: 'student_elective_subject',
        timestamps: true,
        paranoid: true
    }
);