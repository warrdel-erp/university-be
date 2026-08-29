import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import users from "./userModel.js";
import instituteModel from "./instituteModel.js";
import university from "./universityModel.js";
import courseModel from "./courseModel.js";
import sessionModel from "./sessionModel.js";
import subjectModel from "./subjectModel.js";

const creditModel = sequelize.define(
    'credits',
    {
        creditId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'credit_id'
        },
        instituteId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'institute_id',
            references: {
                model: instituteModel,
                key: 'institute_id'
            }
        },
        universityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'university_id',
            references: {
                model: university,
                key: 'university_id'
            }
        },
        courseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'course_id',
            references: {
                model: courseModel,
                key: 'course_id'
            }
        },
        sessionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'session_id',
            references: {
                model: sessionModel,
                key: 'session_id'
            }
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subjectModel,
                key: 'subject_id'
            }
        },
        credit: {
            type: DataTypes.FLOAT,
            allowNull:false
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
        campusId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campus_id',
            references: {
                model: 'campus',
                key: 'campus_id'
            }
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'department_id',
            references: {
                model: 'department',
                key: 'department_id'
            }
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    },
    {
        tableName: 'credits',
        timestamps: true,
        paranoid: true
    }
);

creditModel.scopeConfig = { university: true, institute: true, academicYear: false };

export default creditModel;
