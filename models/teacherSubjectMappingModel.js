import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import employee from "./employeeModel.js"
import classSubjectMapper from "./classSubjectMapperModel.js"

export default sequelize.define(
    'teacher_subject_mapping',
    {
        teacherSubjectMappingId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'teacher_subject_mapping_id'
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employee,
                key: 'employee_id'
            }
        },
        classSubjectMapperId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'class_subject_mapper_id',
            references: {
                model: classSubjectMapper,
                key: 'class_subject_mapper_id'
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
        tableName: 'teacher_subject_mapping',
        timestamps: true,
        paranoid: true
    }
);