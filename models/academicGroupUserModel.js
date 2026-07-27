import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import academicGroup from "./academicGroupModel.js";
import { ACADEMIC_GROUP_USER_ROLES } from "../constant.js";

const academicGroupUserModel = sequelize.define(
    'academic_group_user',
    {
        academicGroupUserId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_group_user_id',
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
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id',
            references: {
                model: users,
                key: 'user_id',
            },
        },
        role: {
            type: DataTypes.ENUM(...ACADEMIC_GROUP_USER_ROLES),
            allowNull: false,
            field: 'role',
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
        tableName: 'academic_group_user',
        timestamps: true,
        paranoid: true,
    },
);

academicGroupUserModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default academicGroupUserModel;
