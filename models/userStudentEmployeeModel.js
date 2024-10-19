import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import userModel from "./userModel.js";
import employeeModel from "./employeeModel.js";
import studentModel from "./studentModel.js";

export default sequelize.define(
  'user_student_employee',
  {
    userStudentEmployeeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field:'user_student_employee_id'
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'employee_id',
        references: {
            model: employeeModel,
            key: 'employee_id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: userModel,
            key: 'user_id'
        }
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'student_id',
        references: {
            model: studentModel,
            key: 'student_id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'updated_at'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field:'deleted_at'
    },
},  
{
    tableName: 'user_student_employee',
    timestamps: true,
    paranoid: true
}
)