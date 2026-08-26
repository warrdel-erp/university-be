import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import academicGroupScope from "./academicGroupScopeModel.js";
import { ACADEMIC_GROUP_PUBLISH_STATUSES } from "../constant.js";

const academicGroupModel = sequelize.define(
    'academic_group',
    {
        academicGroupId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_group_id',
        },
        academicGroupScopeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'academic_group_scope_id',
            references: {
                model: academicGroupScope,
                key: 'academic_group_scope_id',
            },
        },
        groupName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'group_name',
        },
        groupCode: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'group_code',
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'capacity',
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id',
            },
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'department_id',
            references: {
                model: 'department',
                key: 'department_id',
            },
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at',
        },
    },
    {
        tableName: 'academic_group',
        timestamps: true,
        paranoid: true,
    },
);

academicGroupModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default academicGroupModel;
