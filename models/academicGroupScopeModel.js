import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import university from "./universityModel.js";
import institute from "./instituteModel.js";
import acedmicYear from "./acedmicYearModel.js";
import course from "./courseModel.js";
import subject from "./subjectModel.js";
import sessionModel from "./sessionModel.js";
import {
    ACADEMIC_GROUP_TYPES,
    ACADEMIC_GROUP_SELECTION_SCOPES,
    ACADEMIC_GROUP_CONTEXT_TYPES,
} from "../constant.js";

const academicGroupScopeModel = sequelize.define(
    'academic_group_scope',
    {
        academicGroupScopeId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'academic_group_scope_id',
        },
        groupType: {
            type: DataTypes.ENUM(...ACADEMIC_GROUP_TYPES),
            allowNull: false,
            field: 'group_type',
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'title',
        },
        selectionScope: {
            type: DataTypes.ENUM(...ACADEMIC_GROUP_SELECTION_SCOPES),
            allowNull: false,
            field: 'selection_scope',
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'course_id',
            references: {
                model: course,
                key: 'course_id',
            },
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id',
            },
        },
        term: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'term',
        },
        academicContextType: {
            type: DataTypes.ENUM(...ACADEMIC_GROUP_CONTEXT_TYPES),
            allowNull: false,
            defaultValue: 'none',
            field: 'academic_context_type',
        },
        contextSubjectId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'context_subject_id',
            references: {
                model: subject,
                key: 'subject_id',
            },
        },
        activityName: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'activity_name',
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
        tableName: 'academic_group_scope',
        timestamps: true,
        paranoid: true,
    },
);

academicGroupScopeModel.scopeConfig = { university: true, institute: true, academicYear: true };

export default academicGroupScopeModel;
