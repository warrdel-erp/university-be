import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js";
import subject from "./subjectModel.js";
import users from "./userModel.js";

const teacherSubjectMappingModel = sequelize.define(
    'teacher_subject_mapping',
    {
        teacherSubjectMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'teacher_subject_mapping_id'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: users,
                key: 'user_id'
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
            allowNull: false,
            field: 'created_by',
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
        tableName: 'teacher_subject_mapping',
        timestamps: true,
        paranoid: true
    }
);

teacherSubjectMappingModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default teacherSubjectMappingModel;
