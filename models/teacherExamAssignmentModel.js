import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import examScheduleModel from "./examScheduleModel.js";
import employeeModel from "./employeeModel.js";

export default sequelize.define(
    'teacher_exam_assignment',
    {
        teacherExamAssignmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'teacher_exam_assignment_id'
        },
        acedmicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: 'acedmic_year',
                key: 'acedmic_year_id'
            }
        },
        examScheduleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'exam_schedule_id',
            references: {
                model: examScheduleModel,
                key: 'exam_schedule_id'
            }
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id',
            references: {
                model: employeeModel,
                key: 'employee_id'
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
        deadline: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deadline'
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
        }
    },
    {
        tableName: 'teacher_exam_assignment',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                unique: true,
                fields: ['exam_schedule_id', 'employee_id'],
                name: 'uq_teacher_exam_assignment_schedule_employee'
            }
        ]
    }
);
