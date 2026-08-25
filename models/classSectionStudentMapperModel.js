import sequelize from "../database/sequelizeConfig.js";
import { DataTypes } from 'sequelize';
import student from "./studentModel.js";
import users from "./userModel.js";
import acedmicYear from "./acedmicYearModel.js";
import sessionModel from "./sessionModel.js";
import classSectionTermModel from "./classSectionTermModel.js";

/**
 * @deprecated Use studentModel.classSectionTermId / sessionId instead.
 * Physical table renamed to class_student_mapper_depricated.
 * Kept only for legacy fee/invoice references until those are migrated.
 */
const classSectionStudentMapperModel = sequelize.define(
    'class_student_mapper_depricated',
    {
        classStudentMapperId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'class_student_mapper_id'
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
        classSectionTermId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'class_section_term_id',
            references: {
                model: classSectionTermModel,
                key: 'class_section_term_id'
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
        academicYearId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'acedmic_year_id',
            references: {
                model: acedmicYear,
                key: 'acedmic_year_id'
            }
        },
        isPassed :{
            type:DataTypes.BOOLEAN,
            allowNull:false,
            field:'is_passed',
            defaultValue : false
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
    },
    {
        tableName: 'class_student_mapper_depricated',
        timestamps: true,
        paranoid: true
    }
);

classSectionStudentMapperModel.scopeConfig = { university:  true, institute: true, academicYear: true };

export default classSectionStudentMapperModel;
