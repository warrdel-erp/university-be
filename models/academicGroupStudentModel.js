import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import academicGroup from "./academicGroupModel.js";
import student from "./studentModel.js";

const academicGroupStudentModel = sequelize.define(
    'academic_group_student',
    {
        academicGroupStudentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_group_student_id',
        },
        academicGroupId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'academic_group_id',
            references: {
                model: academicGroup,
                key: 'academic_group_id',
            },
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id',
            },
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id',
            },
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: institute,
                key: 'institute_id',
            },
        },
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id',
            },
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'created_by',
            references: {
                model: users,
                key: 'user_id',
            },
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'updated_by',
            references: {
                model: users,
                key: 'user_id',
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at',
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at',
        },
    },
    {
        tableName: 'academic_group_student',
        timestamps: true,
        paranoid: true,
    },
);

academicGroupStudentModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default academicGroupStudentModel;
