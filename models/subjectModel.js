import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import course from "./courseModel.js";
import university from "./universityModel.js";
import specialization from "./specializationModel.js";
import users from "./userModel.js";

export default sequelize.define(
    'subject',
    {
        subjectId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'subject_id'
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
                model: course,
                key: 'course_id'
            }
        },
        specializationId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'specialization_id',
            references: {
                model: specialization,
                key: 'specialization_id'
            }
        },
        subjectName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'subject_name'
        },
        subjectCode: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'subject_code'
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
        tableName: 'subject',
        timestamps: true,
        paranoid: true
    }
);