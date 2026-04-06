import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import campus from './campusModel.js';
import institute from './instituteModel.js';
import users from "./userModel.js";
import role from "./roleModel.js";
import acedmicYear from "./acedmicYearModel.js";

export default sequelize.define(
    'employee',
    {
        employeeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'employee_id',
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'campus_id',
            references: {
                model: campus,
                key: 'campus_id',
            }
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id',
            }
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'role_id',
            references: {
                model: role,
                key: 'role_id',
            }
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
        employeePhoto: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'employee_photo',
        },
        employeeSignature: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'employee_signature',
        },
        employeeCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'employee_Code',
        },
        department: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        employmentType: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'employment_type'
        },
        employeeName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'employee_name',
        },
        dateOfBirth: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'date_of_birth',
        },
        fatherName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'father_name',
        },
        motherName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'mother_name',
        },
        pickColor: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'pick_color',
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
        // updatedBy: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     field: 'updated_by',
        //     references: {
        //         model: users,
        //         key: 'user_id'
        //     }
        // },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'employee',
        timestamps: true,
        paranoid: true
    }
);