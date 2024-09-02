import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import subject from "./subjectModel.js";
import student from "./studentModel.js";
import course from "./courseModel.js";
import specialization from "./specializationModel.js";
import employeeCodeMasterType from "./employeeCodeMasterTypeModel.js";
import users from "./userModel.js"

export default sequelize.define(
    'subject_mapper',
    {
        subjectMapperId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'subject_mapper_id'
        },
        subjectId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'subject_id',
            references: {
                model: subject,
                key: 'subject_id'
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'student_id',
            references: {
                model: student,
                key: 'student_id'
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
        semesterId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'semester_id',
            references: {
                model: employeeCodeMasterType,
                key: 'employee_code_master_type_id'
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
        tableName: 'subject_mapper',
        timestamps: true,
        paranoid: true
    }
);