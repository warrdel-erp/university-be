import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import libraryCreationModel from "./libraryCreationModel.js";
import employeeModel from "./employeeModel.js";
import studentModel from "./studentModel.js";

export default sequelize.define(
    'library_member',
    {
        libraryMemberId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'library_member_id'
        },
        libraryCreationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'library_creation_id',
            references: {
                model: libraryCreationModel,
                key: 'library_creation_id'
            }
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
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'student_id',
            references: {
                model: studentModel,
                key: 'student_id'
            }
        },
        memberType: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'member_type',
        },
        memberId:{
            type: DataTypes.STRING,
            allowNull: false,
            field: 'member_id',
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
        tableName: 'library_member',
        timestamps: true,
        paranoid: true
    }
);